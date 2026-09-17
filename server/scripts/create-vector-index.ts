import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";

// Load server environment
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
const EMBEDDING_DIMENSIONS = parseInt(
  process.env.EMBEDDING_DIMENSIONS || "1536",
  10
);

/**
 * Script to create MongoDB Atlas Vector Search Index on the `code_embeddings` collection.
 *
 * Atlas Vector Search Index Configuration:
 * Name: vector_index
 * Type: vectorSearch
 * Fields:
 *  - embedding: vector (dimensions: 1536 for text-embedding-3-small or 384 for all-MiniLM-L6-v2, similarity: cosine)
 *  - repository_id: filter (for scoping vector search per repository)
 */
async function main() {
  if (!DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is missing in server/.env");
    process.exit(1);
  }

  console.log("==================================================================");
  console.log("       RepoRadar - Atlas Vector Search Index Setup               ");
  console.log("==================================================================");
  console.log(`Connecting to MongoDB at: ${DATABASE_URL.replace(/\/\/.*@/, "//<credentials>@")}...`);

  const client = new MongoClient(DATABASE_URL);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection("code_embeddings");

    console.log("Connected to MongoDB successfully!");
    console.log(`Target Collection: code_embeddings`);
    console.log(`Embedding Dimensions: ${EMBEDDING_DIMENSIONS}`);

    // Create secondary index on repository_id for fast lookup & filtering
    console.log("\nCreating standard B-tree index on repository_id...");
    await collection.createIndex({ repository_id: 1 });
    console.log("✓ Standard index on { repository_id: 1 } ensured.");

    // Attempt programmatic Atlas Search Index creation (supported on MongoDB Atlas driver >= 6.x)
    console.log("\nAttempting programmatic Atlas Vector Search Index creation...");
    try {
      const indexDefinition = {
        name: "vector_index",
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: EMBEDDING_DIMENSIONS,
              similarity: "cosine",
            },
            {
              type: "filter",
              path: "repository_id",
            },
          ],
        },
      };

      // Native driver method createSearchIndex if available on Atlas cluster
      if (typeof (collection as any).createSearchIndex === "function") {
        const resultName = await (collection as any).createSearchIndex(indexDefinition);
        console.log(`✓ Atlas Vector Search Index '${resultName}' initiated successfully!`);
      } else {
        console.log("ℹ️  createSearchIndex not available on this driver/cluster version.");
      }
    } catch (indexError: any) {
      console.warn(`⚠️  Atlas API index creation notice: ${indexError.message}`);
      console.log("\nIf your cluster does not allow programmatic index creation, configure it in Atlas UI:");
    }

    console.log("\n------------------------------------------------------------------");
    console.log("📌 MANUAL ATLAS VECTOR SEARCH INDEX SETUP GUIDE (IF REQUIRED):");
    console.log("1. Open MongoDB Atlas Dashboard -> Database -> Clusters");
    console.log("2. Click on 'Atlas Search' tab -> 'Create Search Index'");
    console.log("3. Choose 'Atlas Vector Search' (JSON Editor)");
    console.log("4. Select database and collection: `code_embeddings`");
    console.log("5. Set Index Name to: `vector_index`");
    console.log("6. Paste the following JSON definition:");
    console.log(
      JSON.stringify(
        {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: EMBEDDING_DIMENSIONS,
              similarity: "cosine",
            },
            {
              type: "filter",
              path: "repository_id",
            },
          ],
        },
        null,
        2
      )
    );
    console.log("7. Click 'Next' and 'Create Search Index'.");
    console.log("------------------------------------------------------------------");
    console.log("ℹ️  Note: RepoRadar includes an automated in-memory cosine fallback");
    console.log("   for local MongoDB instances and development environments.");
    console.log("==================================================================");
  } catch (error: any) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main();
}
