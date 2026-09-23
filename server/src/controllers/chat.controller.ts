import { Request, Response, NextFunction } from "express";
import ragService from "../services/rag.service";
import AppError from "../lib/AppError";

export async function askRepositoryQuestionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const repositoryId = req.params.id as string;
    const { question, conversationId } = req.body;

    const result = await ragService.answerQuestion({
      repositoryId,
      userId,
      question,
      conversationId: conversationId as string | undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRepositoryConversationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const repositoryId = req.params.id as string;
    const conversations = await ragService.getConversations(repositoryId, userId);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversationMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const conversationId = req.params.id as string;
    const result = await ragService.getConversationMessages(conversationId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const conversationId = req.params.id as string;
    const result = await ragService.deleteConversation(conversationId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

