import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  getMeHandler,
} from "../controllers/auth.controller";
import validate from "../middleware/validate";
import authMiddleware from "../middleware/authMiddleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), registerHandler);
router.post("/login", validate(loginSchema), loginHandler);

// Protected routes
router.get("/me", authMiddleware, getMeHandler);

export default router;
