import { ObjectId } from "mongodb";
import prisma from "../lib/db";
import AppError from "../lib/AppError";
import aiServiceClient from "./ai-service.client";
import { getEmbeddingsCollection, CodeEmbeddingDocument } from "../lib/mongo-native";

export interface CodeSearchResultItem {
  id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  chunk_text: string;
  chunk_type: string;
  chunk_label: string;
  language: string | null;
  score: number;
}

export interface CodeSearchResponse {
  query: string;
  total_results: number;
  search_mode: "atlas_vector_search" | "in_memory_cosine_fallback";
  results: CodeSearchResultItem[];
}

/**
 * Calculates cosine similarity between two numeric vectors
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export class VectorSearchService {
  /**
   * Searches repository code chunks using Atlas Vector Search with automatic in-memory fallback.
   */
  async searchCode(
    repositoryId: string,
    userId: string,
    queryText: string,
    limit: number = 10
  ): Promise<CodeSearchResponse> {
    if (!queryText || !queryText.trim()) {
      throw new AppError("Search query text cannot be empty", 400, "INVALID_QUERY");
    }

    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        user_id: userId,
      },
      select: {
        id: true,
        indexing_status: true,
        total_chunks_indexed: true,
      },
    });

    if (!repository) {
      throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
    }

    if (repository.indexing_status !== "completed" && repository.total_chunks_indexed === 0) {
      throw new AppError(
        "Repository code has not been indexed for search yet. Please index repository code first.",
        400,
        "CODE_NOT_INDEXED"
      );
    }

    // Generate query embedding via AI service
    const embeddingRes = await aiServiceClient.generateEmbedding(queryText.trim());
    const queryVector = embeddingRes.embedding;

    const collection = await getEmbeddingsCollection();
    const repoObjectId = new ObjectId(repositoryId);
    const cappedLimit = Math.min(Math.max(1, limit), 50);

    // Attempt 1: Atlas Vector Search Aggregation Pipeline
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryVector,
            numCandidates: Math.max(cappedLimit * 10, 50),
            limit: cappedLimit,
            filter: { repository_id: repoObjectId },
          },
        },
        {
          $project: {
            _id: 1,
            file_path: 1,
            start_line: 1,
            end_line: 1,
            chunk_text: 1,
            chunk_type: 1,
            chunk_label: 1,
            language: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      const cursor = collection.aggregate(pipeline);
      const rawResults = await cursor.toArray();

      if (rawResults && rawResults.length > 0) {
        const results: CodeSearchResultItem[] = rawResults.map((doc: any) => ({
          id: doc._id?.toString() || "",
          file_path: doc.file_path,
          start_line: doc.start_line,
          end_line: doc.end_line,
          chunk_text: doc.chunk_text,
          chunk_type: doc.chunk_type || "block",
          chunk_label: doc.chunk_label || doc.file_path,
          language: doc.language || null,
          score: Math.max(0, Math.min(1, typeof doc.score === "number" ? doc.score : 0.8)),
        }));

        return {
          query: queryText.trim(),
          total_results: results.length,
          search_mode: "atlas_vector_search",
          results,
        };
      }
    } catch (atlasErr: any) {
      console.warn(
        `[VectorSearchService] Atlas $vectorSearch unavailable (${atlasErr.message}). Engaging in-memory cosine fallback.`
      );
    }

    // Fallback: In-memory Cosine Similarity Search
    return this.inMemoryCosineSearch(repoObjectId, queryVector, queryText.trim(), cappedLimit);
  }

  /**
   * Fallback implementation: reads repository chunks and computes cosine similarity in-memory
   */
  private async inMemoryCosineSearch(
    repoObjectId: ObjectId,
    queryVector: number[],
    queryText: string,
    limit: number
  ): Promise<CodeSearchResponse> {
    const collection = await getEmbeddingsCollection();
    const docs = await collection
      .find({ repository_id: repoObjectId })
      .project({
        _id: 1,
        file_path: 1,
        start_line: 1,
        end_line: 1,
        chunk_text: 1,
        chunk_type: 1,
        chunk_label: 1,
        language: 1,
        embedding: 1,
      })
      .toArray();

    if (!docs || docs.length === 0) {
      return {
        query: queryText,
        total_results: 0,
        search_mode: "in_memory_cosine_fallback",
        results: [],
      };
    }

    const scoredDocs = docs
      .map((doc) => {
        const sim = calculateCosineSimilarity(queryVector, doc.embedding || []);
        return {
          id: doc._id?.toString() || "",
          file_path: doc.file_path,
          start_line: doc.start_line,
          end_line: doc.end_line,
          chunk_text: doc.chunk_text,
          chunk_type: doc.chunk_type || "block",
          chunk_label: doc.chunk_label || doc.file_path,
          language: doc.language || null,
          score: Math.max(0, Math.min(1, sim)),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      query: queryText,
      total_results: scoredDocs.length,
      search_mode: "in_memory_cosine_fallback",
      results: scoredDocs,
    };
  }
}

export const vectorSearchService = new VectorSearchService();
export default vectorSearchService;
