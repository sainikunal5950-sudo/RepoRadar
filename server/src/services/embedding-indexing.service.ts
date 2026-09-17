import { ObjectId } from "mongodb";
import prisma from "../lib/db";
import AppError from "../lib/AppError";
import aiServiceClient from "./ai-service.client";
import { getEmbeddingsCollection, CodeEmbeddingDocument } from "../lib/mongo-native";

export interface IndexingSummary {
  files_processed: number;
  chunks_created: number;
  chunks_skipped: number;
}

export interface IndexingStatusResult {
  indexing_status: string;
  total_chunks_indexed: number;
  last_indexed_at?: Date | null;
}

interface CodeFileToProcess {
  id: string;
  file_path: string;
  language: string | null;
  content: string | null;
  file_size: number;
}

// Ignore files that are pure lockfiles, large data files, or minified bundles
const IGNORED_PATH_PATTERNS = [
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /\.min\.js$/i,
  /\.min\.css$/i,
  /\.map$/i,
  /\.svg$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.ico$/i,
];


export class EmbeddingIndexingService {
  /**
   * Retrieves the current indexing status and chunk count for a repository
   */
  async getIndexingStatus(
    repositoryId: string,
    userId: string
  ): Promise<IndexingStatusResult> {
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        user_id: userId,
      },
      select: {
        id: true,
        indexing_status: true,
        total_chunks_indexed: true,
        updatedAt: true,
      },
    });

    if (!repository) {
      throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
    }

    return {
      indexing_status: repository.indexing_status || "not_started",
      total_chunks_indexed: repository.total_chunks_indexed || 0,
      last_indexed_at: repository.updatedAt,
    };
  }

  /**
   * Indexes repository code files into semantic vector embeddings stored in MongoDB.
   * Runs indexing asynchronously or synchronously.
   */
  async triggerRepositoryIndexing(
    repositoryId: string,
    userId: string
  ): Promise<{ message: string; indexing_status: string }> {
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        user_id: userId,
      },
      include: {
        _count: {
          select: { files: true },
        },
      },
    });

    if (!repository) {
      throw new AppError("Repository not found", 404, "REPOSITORY_NOT_FOUND");
    }

    if (repository._count.files === 0) {
      throw new AppError(
        "No repository code files found. Please ingest the code tree first (POST /api/repositories/:id/fetch-code)",
        400,
        "CODE_NOT_FETCHED"
      );
    }

    // Set status to processing immediately
    await prisma.repository.update({
      where: { id: repositoryId },
      data: { indexing_status: "processing" },
    });

    // Execute indexing in background so the client gets an immediate response
    this.executeIndexing(repositoryId).catch(async (err) => {
      console.error(
        `[EmbeddingIndexingService] Background indexing failed for repo ${repositoryId}:`,
        err
      );
      await prisma.repository.update({
        where: { id: repositoryId },
        data: { indexing_status: "failed" },
      });
    });

    return {
      message: "Repository code indexing initiated successfully",
      indexing_status: "processing",
    };
  }

  /**
   * Internal execution logic for chunking and embedding repository code
   */
  async executeIndexing(repositoryId: string): Promise<IndexingSummary> {
    try {
      // Fetch all text files with content
      const files = await prisma.repositoryFile.findMany({
        where: {
          repository_id: repositoryId,
          is_binary: false,
          content: { not: null },
        },
        select: {
          id: true,
          file_path: true,
          language: true,
          content: true,
          file_size: true,
        },
      });

      const validFiles = (files as CodeFileToProcess[]).filter((f: CodeFileToProcess) => {
        if (!f.content || !f.content.trim()) return false;
        if (f.file_size > 500 * 1024) return false; // skip files > 500KB
        return !IGNORED_PATH_PATTERNS.some((pat) => pat.test(f.file_path));
      });

      let totalChunksCreated = 0;
      let totalChunksSkipped = 0;
      const embeddingDocuments: CodeEmbeddingDocument[] = [];
      const repoObjectId = new ObjectId(repositoryId);

      // Process files in concurrency batches (e.g. 5 at a time)
      const batchSize = 5;
      for (let i = 0; i < validFiles.length; i += batchSize) {
        const batch = validFiles.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (file: CodeFileToProcess) => {
            const res = await aiServiceClient.chunkAndEmbed({
              content: file.content as string,
              filePath: file.file_path,
              language: file.language || undefined,
            });
            return { file, res };
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            const { file, res } = r.value;
            for (const chunk of res.chunks) {
              embeddingDocuments.push({
                repository_id: repoObjectId,
                file_path: file.file_path,
                chunk_text: chunk.chunk_text,
                start_line: chunk.start_line,
                end_line: chunk.end_line,
                chunk_type: chunk.chunk_type,
                chunk_label: chunk.chunk_label,
                embedding: chunk.embedding,
                language: file.language || res.language || null,
                created_at: new Date(),
              });
              totalChunksCreated++;
            }
          } else {
            console.warn(
              `[EmbeddingIndexingService] Failed to chunk & embed file:`,
              r.reason
            );
            totalChunksSkipped++;
          }
        }
      }

      // Store in MongoDB Native Collection
      const collection = await getEmbeddingsCollection();

      // Clear old embeddings for this repository to prevent duplicates on re-index
      await collection.deleteMany({ repository_id: repoObjectId });

      // Insert new embedding documents in bulk
      if (embeddingDocuments.length > 0) {
        await collection.insertMany(embeddingDocuments);
      }

      // Update Repository status in Prisma
      await prisma.repository.update({
        where: { id: repositoryId },
        data: {
          indexing_status: "completed",
          total_chunks_indexed: totalChunksCreated,
        },
      });

      return {
        files_processed: validFiles.length,
        chunks_created: totalChunksCreated,
        chunks_skipped: totalChunksSkipped,
      };
    } catch (error: any) {
      await prisma.repository.update({
        where: { id: repositoryId },
        data: { indexing_status: "failed" },
      });
      throw error;
    }
  }
}

export const embeddingIndexingService = new EmbeddingIndexingService();
export default embeddingIndexingService;
