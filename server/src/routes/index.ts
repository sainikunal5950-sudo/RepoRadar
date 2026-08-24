import { Router } from "express";
import healthRoutes from "./health.routes";
import projectRoutes from "./project.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import repositoryRoutes from "./repository.routes";

const router = Router();

// Mount sub-routers
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/repositories", repositoryRoutes);

export default router;
