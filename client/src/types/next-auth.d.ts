import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    accessToken?: string;
    github_id?: number | null;
    github_username?: string | null;
  }

  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      accessToken?: string;
      github_id?: number | null;
      github_username?: string | null;
    };
  }

  interface Profile {
    id?: number;
    login?: string;
    avatar_url?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
    github_id?: number | null;
    github_username?: string | null;
  }
}
