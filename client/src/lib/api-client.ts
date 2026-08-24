import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export interface ApiFetchOptions extends RequestInit {
  token?: string; // Explicit token override
}

/**
 * Fetch wrapper that automatically attaches the user's JWT Authorization header
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const { token: customToken, headers: customHeaders, ...fetchOptions } = options;

  let token = customToken;

  // Retrieve JWT from active NextAuth session if running in browser
  if (!token && typeof window !== "undefined") {
    const session = await getSession();
    token = session?.accessToken || session?.user?.accessToken;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = (await response.json()) as ApiResponse<T>;
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Network request failed",
        code: "NETWORK_ERROR",
      },
    };
  }
}

export default apiClient;
