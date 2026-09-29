import { getEmbeddingsCollection } from "../lib/mongo-native";
import prisma from "../lib/db";

async function clean() {
  const col = await getEmbeddingsCollection();
  const res = await col.deleteMany({
    file_path: { $regex: "site-packages|pytest|pycache|venv|\\.pyc|\\.rst", $options: "i" },
  });
  console.log("DELETED_JUNK_EMBEDDINGS:", res.deletedCount);

  const resFiles = await prisma.repositoryFile.deleteMany({
    where: {
      file_path: {
        contains: "site-packages",
        mode: "insensitive",
      },
    },
  });
  console.log("DELETED_JUNK_FILES:", resFiles.count);

  process.exit(0);
}

clean().catch((e) => {
  console.error(e);
  process.exit(1);
});
