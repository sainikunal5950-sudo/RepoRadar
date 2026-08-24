import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "developer@reporadar.io" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password");
        }

        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const json = await res.json();

          if (!res.ok || !json.success) {
            throw new Error(json.error?.message || "Invalid credentials");
          }

          const { user, token } = json.data;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            accessToken: token,
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to authenticate";
          throw new Error(message);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // If logging in via GitHub OAuth, synchronize user and encrypted token with backend
      if (account?.provider === "github") {
        try {
          const githubId = profile?.id ? Number(profile.id) : Number(account.providerAccountId);
          const githubUsername = (profile as { login?: string })?.login || user.name || "github-user";
          const email = user.email || (profile as { email?: string })?.email;

          if (!email) {
            console.error("GitHub OAuth Error: No email provided by GitHub account");
            return false;
          }

          const res = await fetch(`${API_URL}/api/users/sync-github`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              name: user.name || githubUsername,
              github_id: githubId,
              github_username: githubUsername,
              github_access_token: account.access_token,
            }),
          });

          const json = await res.json();

          if (!res.ok || !json.success) {
            console.error("Failed to sync GitHub user with backend:", json.error);
            return false;
          }

          // Populate user object with backend ID, JWT token, and GitHub attributes
          user.id = json.data.user.id;
          user.name = json.data.user.name;
          user.email = json.data.user.email;
          user.accessToken = json.data.token;
          user.github_id = json.data.user.github_id;
          user.github_username = json.data.user.github_username;

          return true;
        } catch (error) {
          console.error("Error during GitHub OAuth synchronization:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.accessToken = user.accessToken;
        token.github_id = user.github_id;
        token.github_username = user.github_username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.accessToken = token.accessToken;
        session.user.github_id = token.github_id;
        session.user.github_username = token.github_username;
      }
      session.accessToken = token.accessToken;
      return session;
    },
  },
};

/**
 * Server-side helper to get the authenticated session in Server Components / Route Handlers
 */
export const getAuthSession = () => getServerSession(authOptions);

export default authOptions;
