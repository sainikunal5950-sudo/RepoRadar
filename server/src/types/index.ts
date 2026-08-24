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
}

export interface AuthResponse {
  user: AuthUserPayload;
  token: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
