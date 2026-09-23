import { Router } from "express";
import { handleGitHubWebhook } from "../controllers/webhook.controller";

const router = Router();

// Public webhook receiver for GitHub (signature verification enforced inside controller)
router.post("/github", handleGitHubWebhook);

export default router;
