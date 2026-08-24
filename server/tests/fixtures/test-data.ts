import jwt from "jsonwebtoken";

export const mockUser = {
  id: "65d75cf9e1d84f23b890abcd",
  name: "Test Developer",
  email: "test@reporadar.io",
  github_id: 12345678,
  github_username: "testdev",
  github_access_token: "0123456789abcdef:0123456789abcdef:0123456789abcdef",
};

export const mockRepository = {
  id: "65d75cf9e1d84f23b890abce",
  user_id: mockUser.id,
  github_repo_id: 98765432,
  github_repo_name: "sample-repo",
  github_repo_fullname: "testdev/sample-repo",
  github_repo_url: "https://github.com/testdev/sample-repo",
  description: "A mock repository for testing AST analysis and file tree indexing",
  stars: 10,
  language: "TypeScript",
  is_selected: true,
  last_synced_at: new Date("2026-08-24T00:00:00Z"),
  createdAt: new Date("2026-08-24T00:00:00Z"),
  updatedAt: new Date("2026-08-24T00:00:00Z"),
  metrics: {
    id: "65d75cf9e1d84f23b890abcc",
    repository_id: "65d75cf9e1d84f23b890abce",
    stars_count: 10,
    forks_count: 2,
    open_issues_count: 1,
    open_prs_count: 1,
    default_branch: "main",
    total_commits: 45,
    last_commit_date: new Date("2026-08-24T00:00:00Z"),
  },
};

export const mockGitTree = [
  {
    path: "src",
    mode: "040000",
    type: "tree" as const,
    sha: "tree_sha_src",
  },
  {
    path: "src/index.ts",
    mode: "100644",
    type: "blob" as const,
    sha: "blob_sha_index",
    size: 512,
  },
  {
    path: "src/utils.ts",
    mode: "100644",
    type: "blob" as const,
    sha: "blob_sha_utils",
    size: 1024,
  },
  {
    path: "package.json",
    mode: "100644",
    type: "blob" as const,
    sha: "blob_sha_pkg",
    size: 256,
  },
  {
    path: "node_modules/express/index.js",
    mode: "100644",
    type: "blob" as const,
    sha: "blob_sha_node_modules",
    size: 2048,
  },
  {
    path: "logo.png",
    mode: "100644",
    type: "blob" as const,
    sha: "blob_sha_logo",
    size: 15000,
  },
];

export function generateTestJWT(userId = mockUser.id, email = mockUser.email, secret = "BSNlG2twzbL8JA4XMfmkBlLN7XWr0y4q") {
  return jwt.sign(
    {
      id: userId,
      email,
      name: mockUser.name,
      github_id: mockUser.github_id,
      github_username: mockUser.github_username,
    },
    secret,
    { expiresIn: "1h" }
  );
}
