import type { Request, Response } from "express";
import type { ApiError } from "@salil-sandesh/shared";
import { authUserId } from "../middleware/auth";
import {
  createArticle,
  deleteArticle,
  getArticleById,
  listAllArticles,
  setArticleStatus,
  SlugConflictError,
  updateArticle,
} from "../services/article-admin.service";
import {
  adminListQuerySchema,
  articlePayloadSchema,
  objectIdSchema,
} from "../utils/article-schemas";

function invalid(res: Response, message: string): void {
  res.status(400).json({ error: message } satisfies ApiError);
}

function notFound(res: Response): void {
  res.status(404).json({ error: "not found" } satisfies ApiError);
}

function articleId(req: Request, res: Response): string | null {
  const parsed = objectIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    notFound(res);
    return null;
  }
  return parsed.data;
}

export async function handleAdminListArticles(req: Request, res: Response): Promise<void> {
  const query = adminListQuerySchema.safeParse(req.query);
  if (!query.success) {
    invalid(res, "invalid query");
    return;
  }
  res.json(await listAllArticles(query.data));
}

export async function handleAdminGetArticle(req: Request, res: Response): Promise<void> {
  const id = articleId(req, res);
  if (!id) {
    return;
  }
  const article = await getArticleById(id);
  if (!article) {
    notFound(res);
    return;
  }
  res.json(article);
}

export async function handleAdminCreateArticle(req: Request, res: Response): Promise<void> {
  const payload = articlePayloadSchema.safeParse(req.body);
  if (!payload.success) {
    invalid(res, payload.error.issues[0]?.message ?? "invalid article payload");
    return;
  }
  const userId = authUserId(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" } satisfies ApiError);
    return;
  }
  try {
    res.status(201).json(await createArticle(payload.data, userId));
  } catch (error) {
    if (error instanceof SlugConflictError) {
      res.status(409).json({ error: error.message } satisfies ApiError);
      return;
    }
    throw error;
  }
}

export async function handleAdminUpdateArticle(req: Request, res: Response): Promise<void> {
  const id = articleId(req, res);
  if (!id) {
    return;
  }
  const payload = articlePayloadSchema.safeParse(req.body);
  if (!payload.success) {
    invalid(res, payload.error.issues[0]?.message ?? "invalid article payload");
    return;
  }
  try {
    const article = await updateArticle(id, payload.data);
    if (!article) {
      notFound(res);
      return;
    }
    res.json(article);
  } catch (error) {
    if (error instanceof SlugConflictError) {
      res.status(409).json({ error: error.message } satisfies ApiError);
      return;
    }
    throw error;
  }
}

export function makeStatusHandler(status: "draft" | "published") {
  return async function handleStatusChange(req: Request, res: Response): Promise<void> {
    const id = articleId(req, res);
    if (!id) {
      return;
    }
    const article = await setArticleStatus(id, status);
    if (!article) {
      notFound(res);
      return;
    }
    res.json(article);
  };
}

export async function handleAdminDeleteArticle(req: Request, res: Response): Promise<void> {
  const id = articleId(req, res);
  if (!id) {
    return;
  }
  const deleted = await deleteArticle(id);
  if (!deleted) {
    notFound(res);
    return;
  }
  res.json({ ok: true });
}
