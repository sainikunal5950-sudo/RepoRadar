import { Router } from "express";
import { syncGithubHandler } from "../controllers/user.controller";
import validate from "../middleware/validate";
import { syncGithubSchema } from "../schemas/user.schema";

const router = Router();

// Unprotected endpoint called by NextAuth signIn callback
router.post("/sync-github", validate(syncGithubSchema), syncGithubHandler);

export default router;
