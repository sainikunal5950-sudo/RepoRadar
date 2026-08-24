import jwt from "jsonwebtoken";
import prisma from "../lib/db";
import config from "../config";
import { encryptToken } from "../lib/encryption";
import { SyncGithubInput } from "../schemas/user.schema";
import { AuthUserPayload } from "../types";

export class UserService {
  /**
   * Synchronize user authenticated via GitHub OAuth
   * Creates a new user or updates existing user with encrypted GitHub access token
   */
  async syncGithubUser(data: SyncGithubInput) {
    const email = data.email.toLowerCase();
    const encryptedToken = data.github_access_token
      ? encryptToken(data.github_access_token)
      : null;

    // Check if user already exists by email or github_id
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { github_id: data.github_id }],
      },
    });

    let user;

    if (existingUser) {
      // Update existing user with latest GitHub profile details & encrypted token
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          github_id: data.github_id,
          github_username: data.github_username || existingUser.github_username,
          ...(encryptedToken ? { github_access_token: encryptedToken } : {}),
          ...(data.name && (!existingUser.name || existingUser.name === "GitHub User")
            ? { name: data.name }
            : {}),
        },
      });
    } else {
      // Create new user profile from GitHub OAuth
      user = await prisma.user.create({
        data: {
          name: data.name || data.github_username || "GitHub Developer",
          email,
          github_id: data.github_id,
          github_username: data.github_username || null,
          github_access_token: encryptedToken,
        },
      });
    }

    const userPayload: AuthUserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      github_id: user.github_id,
      github_username: user.github_username,
    };

    // Sign JWT session token valid for 7 days
    const token = jwt.sign(userPayload, config.jwtSecret, {
      expiresIn: "7d",
    });

    return {
      user: userPayload,
      token,
    };
  }

  /**
   * Fetch user by ID (omitting raw/encrypted secrets)
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        github_id: true,
        github_username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}

export const userService = new UserService();
export default userService;
