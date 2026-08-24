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
