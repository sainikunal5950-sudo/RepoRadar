import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/db";
import config from "../config";
import AppError from "../lib/AppError";
import { RegisterInput, LoginInput } from "../schemas/auth.schema";
import { AuthUserPayload } from "../types";

export class AuthService {
  /**
   * Register a new user with hashed password
   */
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError("A user with this email address already exists", 409, "EMAIL_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Validate credentials and issue JWT token (used by NextAuth Credentials provider)
   */
  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user || !user.password) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const userPayload: AuthUserPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    // Issue JWT valid for 7 days
    const token = jwt.sign(userPayload, config.jwtSecret, {
      expiresIn: "7d",
    });

    return {
      user: userPayload,
      token,
    };
  }

  /**
   * Fetch user details by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "NOT_FOUND");
    }

    return user;
  }
}

export const authService = new AuthService();
export default authService;
