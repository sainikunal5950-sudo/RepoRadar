import prisma from "../lib/db";
import AppError from "../lib/AppError";
import { decryptToken } from "../lib/encryption";
import {
  initializeOctokit,
  fetchRepositoryGitTree,
  fetchFileContent,
  GitTreeItem,
} from "./github.service";
import { TreeNode } from "../types";

const IGNORE_PATTERNS = [
  /^node_modules(\/|$)/,
  /^\.git(\/|$)/,
  /^\.next(\/|$)/,
  /^dist(\/|$)/,
  /^build(\/|$)/,
  /^out(\/|$)/,
  /^\.turbo(\/|$)/,
  /^coverage(\/|$)/,
  /^__pycache__(\/|$)/,
  /^\.venv(\/|$)/,
  /^venv(\/|$)/,
  /^\.idea(\/|$)/,
  /^\.vscode(\/|$)/,
  /\.DS_Store$/,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
];

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "ico", "svg", "webp", "bmp", "tiff",
  "pdf", "zip", "tar", "gz", "rar", "7z",
  "exe", "dll", "so", "dylib", "bin", "jar", "class",
  "woff", "woff2", "ttf", "eot", "otf",
  "mp4", "mp3", "wav", "avi", "mov",
  "dmg", "iso", "apk", "ipa",
]);

const LANGUAGE_EXT_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  md: "markdown",
  mdx: "markdown",
  yaml: "yaml",
  yml: "yaml",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  sql: "sql",
  env: "plaintext",
  txt: "plaintext",
  dockerfile: "dockerfile",
  prisma: "prisma",
  graphql: "graphql",
  gql: "graphql",
  toml: "toml",
  xml: "xml",
  svg: "xml",
};

export function shouldIgnorePath(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function detectLanguageAndBinary(filePath: string): {
  language: string;
  extension: string;
  isBinary: boolean;
} {
  const parts = filePath.split(".");
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  const isBinary = BINARY_EXTENSIONS.has(extension);
  const language = LANGUAGE_EXT_MAP[extension] || (isBinary ? "binary" : "plaintext");

  return { language, extension, isBinary };
}

/**
 * Builds a hierarchical nested tree from flat file path records
 */
export function buildNestedTree(
  files: Array<{
    path: string;
    type: "file" | "folder";
    size?: number;
    file_id?: string;
    file_type?: string;
    language?: string | null;
  }>
): TreeNode[] {
  const root: TreeNode[] = [];

  for (const item of files) {
    const parts = item.path.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      let existingNode = currentLevel.find((node) => node.name === part);

      if (!existingNode) {
        if (isLast && item.type === "file") {
          existingNode = {
            name: part,
            path: currentPath,
            type: "file",
            size: item.size,
            file_id: item.file_id,
            file_type: item.file_type,
            language: item.language,
          };
          currentLevel.push(existingNode);
        } else {
          existingNode = {
            name: part,
            path: currentPath,
            type: "folder",
            children: [],
          };
          currentLevel.push(existingNode);
        }
      }

      if (!isLast || item.type === "folder") {
        if (!existingNode.children) {
          existingNode.children = [];
        }
        currentLevel = existingNode.children;
      }
    }
  }

  // Sort folders first, then files alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(root);
  return root;
}

export class CodeFetchService {
  /**
   * Fetches full repository files via Git Database Tree, indexes content, and stores nested tree structure
   */
  async fetchAndIndexRepositoryCode(userId: string, repoId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
      include: { metrics: true },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.github_access_token) {
      throw new AppError("GitHub account not linked. Please sign in with GitHub.", 400, "GITHUB_NOT_LINKED");
    }

    const decryptedToken = decryptToken(user.github_access_token);
    const octokit = initializeOctokit(decryptedToken);

    const [owner, repoName] = repo.github_repo_fullname.split("/");
    if (!owner || !repoName) {
      throw new AppError("Invalid repository fullname", 400, "INVALID_REPO_NAME");
    }

    const defaultBranch = repo.metrics?.default_branch || "HEAD";

    // 1. Fetch entire recursive git tree
    let rawTree: GitTreeItem[];
    try {
      rawTree = await fetchRepositoryGitTree(octokit, owner, repoName, defaultBranch);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Git tree API error";
      throw new AppError(`Failed to fetch git tree from GitHub: ${errorMsg}`, 500, "GIT_TREE_ERROR");
    }

    // 2. Filter out ignored files and directories
    const validBlobItems: GitTreeItem[] = [];
    const allTreeItemsForStructure: Array<{
      path: string;
      type: "file" | "folder";
      size?: number;
      file_type?: string;
      language?: string | null;
    }> = [];

    let totalDirs = 0;

    for (const item of rawTree) {
      if (shouldIgnorePath(item.path)) {
        continue;
      }

      if (item.type === "tree") {
        totalDirs++;
        allTreeItemsForStructure.push({
          path: item.path,
          type: "folder",
        });
      } else if (item.type === "blob") {
        const { language, extension, isBinary } = detectLanguageAndBinary(item.path);
        validBlobItems.push(item);
        allTreeItemsForStructure.push({
          path: item.path,
          type: "file",
          size: item.size || 0,
          file_type: extension,
          language,
        });
      }
    }

    // 3. Limit indexing to max 1000 files to maintain fast performance and respect DB limits
    const MAX_INDEX_FILES = 1000;
    const filesToIndex = validBlobItems.slice(0, MAX_INDEX_FILES);

    // 4. Concurrently download file content (batch size of 10)
    const now = new Date();
    const batchSize = 10;
    const indexedFileRecords: Array<{
      id?: string;
      path: string;
      extension: string;
      size: number;
      language: string;
      content: string | null;
      isBinary: boolean;
    }> = [];

    for (let i = 0; i < filesToIndex.length; i += batchSize) {
      const batch = filesToIndex.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          const { language, extension, isBinary } = detectLanguageAndBinary(item.path);
          let content: string | null = null;

          // Fetch content for non-binary text files <= 1MB
          const fileSize = item.size || 0;
          if (!isBinary && fileSize <= 1048576) {
            try {
              const fileData = await fetchFileContent(
                octokit,
                owner,
                repoName,
                item.path,
                defaultBranch
              );
              content = fileData.content;
            } catch {
              content = null;
            }
          }

          indexedFileRecords.push({
            path: item.path,
            extension,
            size: fileSize,
            language,
            content,
            isBinary,
          });
        })
      );
    }

    // 5. Delete existing files for this repository and insert fresh records
    await prisma.repositoryFile.deleteMany({
      where: { repository_id: repoId },
    });

    if (indexedFileRecords.length > 0) {
      await prisma.repositoryFile.createMany({
        data: indexedFileRecords.map((f) => ({
          repository_id: repoId,
          file_path: f.path,
          file_type: f.extension,
          file_size: f.size,
          language: f.language,
          content: f.content,
          is_binary: f.isBinary,
          last_fetched_at: now,
        })),
      });
    }

    // 6. Retrieve stored files to map their database IDs into the file tree
    const savedFiles = await prisma.repositoryFile.findMany({
      where: { repository_id: repoId },
      select: { id: true, file_path: true, file_type: true, file_size: true, language: true },
    });

    const fileIdMap = new Map(savedFiles.map((sf) => [sf.file_path, sf]));

    // Map IDs to tree items
    const treeItemsWithIds = allTreeItemsForStructure.map((item) => {
      const saved = fileIdMap.get(item.path);
      return {
        path: item.path,
        type: item.type,
        size: item.size,
        file_id: saved?.id,
        file_type: saved?.file_type || item.file_type,
        language: saved?.language || item.language,
      };
    });

    // 7. Build hierarchical nested tree
    const nestedTree = buildNestedTree(treeItemsWithIds);
    const treeJsonString = JSON.stringify(nestedTree);

    // 8. Upsert RepositoryFileTree
    await prisma.repositoryFileTree.upsert({
      where: { repository_id: repoId },
      update: {
        tree_json: treeJsonString,
        total_files: savedFiles.length,
        total_dirs: totalDirs,
        updated_at: now,
      },
      create: {
        repository_id: repoId,
        tree_json: treeJsonString,
        total_files: savedFiles.length,
        total_dirs: totalDirs,
      },
    });

    return {
      total_files: rawTree.filter((t) => t.type === "blob").length,
      indexed_files: savedFiles.length,
      skipped_files: rawTree.length - validBlobItems.length,
      total_dirs: totalDirs,
      tree: nestedTree,
    };
  }

  /**
   * Retrieves stored hierarchical file tree
   */
  async getRepositoryFileTree(userId: string, repoId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const fileTree = await prisma.repositoryFileTree.findUnique({
      where: { repository_id: repoId },
    });

    if (!fileTree) {
      return {
        tree: [],
        total_files: 0,
        total_dirs: 0,
        updated_at: null,
      };
    }

    return {
      tree: JSON.parse(fileTree.tree_json) as TreeNode[],
      total_files: fileTree.total_files,
      total_dirs: fileTree.total_dirs,
      updated_at: fileTree.updated_at,
    };
  }

  /**
   * Retrieves paginated repository files metadata
   */
  async getRepositoryFiles(
    userId: string,
    repoId: string,
    options: { page?: number; limit?: number; language?: string; search?: string }
  ) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      repository_id: repoId,
    };

    if (options.language) {
      whereClause.language = options.language;
    }

    if (options.search) {
      whereClause.file_path = { contains: options.search, mode: "insensitive" };
    }

    const [files, total] = await Promise.all([
      prisma.repositoryFile.findMany({
        where: whereClause,
        select: {
          id: true,
          repository_id: true,
          file_path: true,
          file_type: true,
          file_size: true,
          language: true,
          is_binary: true,
          last_fetched_at: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { file_path: "asc" },
        skip,
        take: limit,
      }),
      prisma.repositoryFile.count({ where: whereClause }),
    ]);

    return {
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single file content by file ID
   */
  async getRepositoryFileContent(userId: string, repoId: string, fileId: string) {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, user_id: userId },
    });

    if (!repo) {
      throw new AppError(`Repository with ID '${repoId}' not found`, 404, "NOT_FOUND");
    }

    const file = await prisma.repositoryFile.findFirst({
      where: { id: fileId, repository_id: repoId },
    });

    if (!file) {
      throw new AppError(`File with ID '${fileId}' not found`, 404, "NOT_FOUND");
    }

    return file;
  }
}

export const codeFetchService = new CodeFetchService();
export default codeFetchService;
