import { Router } from "express";
import {
  getConversationMessagesHandler,
  deleteConversationHandler,
} from "../controllers/chat.controller";
import authMiddleware from "../middleware/authMiddleware";
import validate from "../middleware/validate";
import { conversationIdParamSchema } from "../schemas/chat.schema";

const router = Router();

// Protect all chat conversation routes with JWT authentication
router.use(authMiddleware);

// GET /api/chat/conversations/:id/messages - Retrieve full message history for a conversation
router.get(
  "/conversations/:id/messages",
  validate(conversationIdParamSchema),
  getConversationMessagesHandler
);

// DELETE /api/chat/conversations/:id - Delete a conversation and its messages
router.delete(
  "/conversations/:id",
  validate(conversationIdParamSchema),
  deleteConversationHandler
);

export default router;
