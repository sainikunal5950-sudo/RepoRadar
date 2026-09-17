import { MongoClient, Db, Collection, ObjectId } from "mongodb";

/**
 * Mongo Native Schema Definition: code_embeddings
 * Managed directly via native driver for Atlas Vector Search compatibility.
 *
 * Collection: code_embeddings
 * Documents:
 * - _id: ObjectId (Document unique identifier)
 * - repository_id: ObjectId (Referencing Repository._id)
 * - file_path: string (Repository-relative path e.g. "src/lib/auth.ts")
 * - chunk_text: string (Extracted raw code segment)
 * - start_line: number (1-indexed start line number)
 * - end_line: number (1-indexed end line number)
 * - chunk_type: string ("function" | "class" | "block" | "module" | "general")
 * - chunk_label: string (Semantic label e.g. "function authenticateUser")
 * - embedding: number[] (Array of float numbers from embedding model)
 * - language: string | null (Normalized language identifier)
 * - created_at: Date (Timestamp of indexing)
 */
export interface CodeEmbeddingDocument {
  _id?: ObjectId;
  repository_id: ObjectId;
  file_path: string;
  chunk_text: string;
  start_line: number;
  end_line: number;
  chunk_type: string;
  chunk_label: string;
  embedding: number[];
  language: string | null;
  created_at: Date;
}

let clientInstance: MongoClient | null = null;
let dbInstance: Db | null = null;

/**
 * Retrieves or establishes the singleton native MongoClient connection.
 */
export async function getNativeMongoClient(): Promise<MongoClient> {
  if (clientInstance) {
    return clientInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required for native MongoDB connection"
    );
  }

  const client = new MongoClient(databaseUrl, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
  });

  await client.connect();
  clientInstance = client;
  return clientInstance;
}

/**
 * Returns the native Db instance associated with the active connection.
 */
export async function getNativeMongoDb(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }
  const client = await getNativeMongoClient();
  dbInstance = client.db();
  return dbInstance;
}

/**
 * Returns the strongly typed code_embeddings collection.
 */
export async function getEmbeddingsCollection(): Promise<
  Collection<CodeEmbeddingDocument>
> {
  const db = await getNativeMongoDb();
  return db.collection<CodeEmbeddingDocument>("code_embeddings");
}

/**
 * Closes the native MongoClient connection if active (useful in tests/graceful teardown).
 */
export async function closeNativeMongoClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
    dbInstance = null;
  }
}
