import type { Request, Response } from "express";
import { z } from "zod";
import type { ApiError } from "@salil-sandesh/shared";
import {
  deleteMedia,
  listMedia,
  MediaReferencedError,
  UnsupportedMediaError,
  uploadImage,
} from "../services/media.service";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

const idSchema = z.string().regex(/^[0-9a-f]{24}$/);
const altSchema = z.string().max(300).optional();

export async function handleListMedia(req: Request, res: Response): Promise<void> {
  const query = listQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "invalid query" } satisfies ApiError);
    return;
  }
  res.json(await listMedia(query.data.page, query.data.limit));
}

export async function handleUploadMedia(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "no file uploaded" } satisfies ApiError);
    return;
  }
  const alt = altSchema.safeParse(req.body?.alt);
  if (!alt.success) {
    res.status(400).json({ error: "invalid alt text" } satisfies ApiError);
    return;
  }
  try {
    const media = await uploadImage(req.file.buffer, req.file.mimetype, alt.data ?? "");
    res.status(201).json(media);
  } catch (error) {
    if (error instanceof UnsupportedMediaError) {
      res.status(400).json({ error: error.message } satisfies ApiError);
      return;
    }
    throw error;
  }
}

export async function handleDeleteMedia(req: Request, res: Response): Promise<void> {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ error: "not found" } satisfies ApiError);
    return;
  }
  try {
    const deleted = await deleteMedia(id.data);
    if (!deleted) {
      res.status(404).json({ error: "not found" } satisfies ApiError);
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof MediaReferencedError) {
      res.status(409).json({ error: error.message } satisfies ApiError);
      return;
    }
    throw error;
  }
}
