export interface HealthResponse {
  status: "ok" | "error";
  service: string;
  timestamp: string;
  environment: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  github_id?: number | null;
  github_username?: string | null;
}

export interface AuthResponse {
  user: AuthUserPayload;
  token: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  github_id: number | null;
  github_username: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RepositoryMetricsResponse {
  id: string;
  repository_id: string;
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  open_prs_count: number;
  default_branch: string | null;
  total_commits: number | null;
  last_commit_date: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RepositoryLanguageResponse {
  id: string;
  repository_id: string;
  language: string;
  bytes: number;
  percentage: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RepositoryCommitResponse {
  id: string;
  repository_id: string;
  commit_sha: string;
  author: string;
  message: string;
  committed_at: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RepositoryFileResponse {
  id: string;
  repository_id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  language: string | null;
  content?: string | null;
  is_binary: boolean;
  last_fetched_at: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  file_id?: string;
  file_type?: string;
  language?: string | null;
  children?: TreeNode[];
}

export interface RepositoryFileTreeResponse {
  id: string;
  repository_id: string;
  tree: TreeNode[];
  total_files: number;
  total_dirs: number;
  updated_at: Date | string;
}

export interface RepositoryResponse {
  id: string;
  user_id: string;
  github_repo_id: number;
  github_repo_name: string;
  github_repo_fullname: string;
  github_repo_url: string;
  description: string | null;
  stars: number;
  language: string | null;
  is_selected: boolean;
  last_synced_at: Date | string | null;
  metrics?: RepositoryMetricsResponse | null;
  languages?: RepositoryLanguageResponse[];
  commits?: RepositoryCommitResponse[];
  files?: RepositoryFileResponse[];
  fileTree?: RepositoryFileTreeResponse | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
