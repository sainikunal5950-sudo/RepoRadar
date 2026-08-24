import { Router } from "express";
import healthRoutes from "./health.routes";
import projectRoutes from "./project.routes";

const router = Router();

// Mount sub-routers
router.use("/health", healthRoutes);
router.use("/projects", projectRoutes);

export default router;
