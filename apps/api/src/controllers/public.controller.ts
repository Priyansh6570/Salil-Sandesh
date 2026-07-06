import type { Request, Response } from "express";
import type {
  ApiError,
  AuthorPublic,
  Category,
  SiteConfig,
  Tag,
} from "@salil-sandesh/shared";
import type { z, ZodTypeAny } from "zod";
import { siteConfig } from "../config/site";
import { CategoryModel, MediaModel, TagModel, UserModel, type ArticleDoc } from "../models";
import {
  getPublishedArticleBySlug,
  listPublishedArticles,
  searchPublishedArticles,
} from "../services/article-read.service";
import { mediaUrlFromKey } from "../utils/media-url";
import {
  langQuerySchema,
  pageQuerySchema,
  searchQuerySchema,
  slugParamSchema,
} from "../utils/query-schemas";
import type { FilterQuery } from "mongoose";

function parseOr400<S extends ZodTypeAny>(
  schema: S,
  value: unknown,
  res: Response
): z.output<S> | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid query" } satisfies ApiError);
    return null;
  }
  return parsed.data;
}

export function getSiteConfig(_req: Request, res: Response<SiteConfig>): void {
  res.json(siteConfig);
}

export async function listCategories(_req: Request, res: Response<Category[]>): Promise<void> {
  const docs = await CategoryModel.find().sort({ order: 1, name: 1 });
  res.json(
    docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      order: doc.order,
      parentId: doc.parentId?.toString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }))
  );
}

export async function listTags(_req: Request, res: Response<Tag[]>): Promise<void> {
  const docs = await TagModel.find().sort({ name: 1 });
  res.json(
    docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }))
  );
}

export async function listArticles(req: Request, res: Response): Promise<void> {
  const query = parseOr400(pageQuerySchema, req.query, res);
  if (!query) {
    return;
  }
  const filter: FilterQuery<ArticleDoc> = {
    ...(query.featured === "true" ? { isFeatured: true } : {}),
    ...(query.breaking === "true" ? { isBreaking: true } : {}),
  };
  res.json(await listPublishedArticles({ ...query, filter }));
}

export async function searchArticles(req: Request, res: Response): Promise<void> {
  const query = parseOr400(searchQuerySchema, req.query, res);
  if (!query) {
    return;
  }
  res.json(await searchPublishedArticles(query.q, query));
}

async function listByRef(
  req: Request,
  res: Response,
  buildFilter: (slug: string) => Promise<FilterQuery<ArticleDoc> | null>
): Promise<void> {
  const params = parseOr400(slugParamSchema, req.params, res);
  if (!params) {
    return;
  }
  const query = parseOr400(pageQuerySchema, req.query, res);
  if (!query) {
    return;
  }
  const filter = await buildFilter(params.slug);
  if (!filter) {
    res.status(404).json({ error: "not found" } satisfies ApiError);
    return;
  }
  res.json(await listPublishedArticles({ ...query, filter }));
}

export async function listArticlesByCategory(req: Request, res: Response): Promise<void> {
  await listByRef(req, res, async (slug) => {
    const category = await CategoryModel.findOne({ slug });
    return category ? { categoryId: category._id } : null;
  });
}

export async function listArticlesByTag(req: Request, res: Response): Promise<void> {
  await listByRef(req, res, async (slug) => {
    const tag = await TagModel.findOne({ slug });
    return tag ? { tagIds: tag._id } : null;
  });
}

export async function listArticlesByAuthor(req: Request, res: Response): Promise<void> {
  await listByRef(req, res, async (slug) => {
    const author = await UserModel.findOne({ slug, status: "active" });
    return author ? { authorId: author._id } : null;
  });
}

export async function getArticleBySlug(req: Request, res: Response): Promise<void> {
  const params = parseOr400(slugParamSchema, req.params, res);
  if (!params) {
    return;
  }
  const query = parseOr400(langQuerySchema, req.query, res);
  if (!query) {
    return;
  }
  const article = await getPublishedArticleBySlug(params.slug, query.lang);
  if (!article) {
    res.status(404).json({ error: "not found" } satisfies ApiError);
    return;
  }
  res.json(article);
}

export async function getAuthorBySlug(req: Request, res: Response): Promise<void> {
  const params = parseOr400(slugParamSchema, req.params, res);
  if (!params) {
    return;
  }
  const author = await UserModel.findOne({ slug: params.slug, status: "active" });
  if (!author) {
    res.status(404).json({ error: "not found" } satisfies ApiError);
    return;
  }
  const avatarDoc = author.avatarMediaId
    ? await MediaModel.findById(author.avatarMediaId)
    : null;
  const profile: AuthorPublic = {
    id: author.id,
    name: author.name,
    slug: author.slug,
    bio: author.bio ?? undefined,
    avatar: avatarDoc
      ? {
          url: mediaUrlFromKey(avatarDoc.key),
          width: avatarDoc.width,
          height: avatarDoc.height,
          alt: avatarDoc.alt,
        }
      : undefined,
  };
  res.json(profile);
}
