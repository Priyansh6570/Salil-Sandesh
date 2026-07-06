import type { Article, LanguageCode, Paginated } from "@salil-sandesh/shared";
import type { HydratedDocument } from "mongoose";
import { ArticleModel, type ArticleDoc } from "../models";
import type { ArticlePayload } from "../utils/article-schemas";

type ArticleHydrated = HydratedDocument<ArticleDoc>;

export class SlugConflictError extends Error {
  constructor(public readonly language: string, public readonly slug: string) {
    super(`slug '${slug}' is already used by another article in language '${language}'`);
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

async function mapDuplicateKey<T>(payload: ArticlePayload, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const [language, translation] = Object.entries(payload.translations)[0] ?? ["", null];
      throw new SlugConflictError(language, translation?.slug ?? "");
    }
    throw error;
  }
}

function toWire(doc: ArticleHydrated): Article {
  const translations: Article["translations"] = {};
  for (const [language, translation] of doc.translations.entries()) {
    translations[language as LanguageCode] = {
      title: translation.title,
      excerpt: translation.excerpt,
      slug: translation.slug,
      body: translation.body,
    };
  }
  return {
    id: doc.id,
    defaultLanguage: doc.defaultLanguage,
    translations,
    categoryId: doc.categoryId.toString(),
    authorId: doc.authorId.toString(),
    tagIds: doc.tagIds.map((id) => id.toString()),
    coverMediaId: doc.coverMediaId?.toString(),
    isBreaking: doc.isBreaking,
    isFeatured: doc.isFeatured,
    isPremium: doc.isPremium,
    status: doc.status,
    publishedAt: doc.publishedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function assertSlugsAvailable(
  payload: ArticlePayload,
  excludeId?: string
): Promise<void> {
  for (const [language, translation] of Object.entries(payload.translations)) {
    const conflict = await ArticleModel.exists({
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      [`translations.${language}.slug`]: translation.slug,
    });
    if (conflict) {
      throw new SlugConflictError(language, translation.slug);
    }
  }
}

export async function listAllArticles(options: {
  page: number;
  limit: number;
  status?: "draft" | "published";
}): Promise<Paginated<Article>> {
  const filter = options.status ? { status: options.status } : {};
  const skip = (options.page - 1) * options.limit;
  const [docs, total] = await Promise.all([
    ArticleModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(options.limit),
    ArticleModel.countDocuments(filter),
  ]);
  return {
    items: docs.map((doc) => {
      const wire = toWire(doc);
      const bodyFree: Article["translations"] = {};
      for (const [language, translation] of Object.entries(wire.translations)) {
        bodyFree[language as LanguageCode] = { ...translation, body: { type: "doc" } };
      }
      return { ...wire, translations: bodyFree };
    }),
    page: options.page,
    limit: options.limit,
    total,
  };
}

export async function getArticleById(id: string): Promise<Article | null> {
  const doc = await ArticleModel.findById(id);
  return doc ? toWire(doc) : null;
}

export async function createArticle(
  payload: ArticlePayload,
  authorId: string
): Promise<Article> {
  await assertSlugsAvailable(payload);
  const doc = await mapDuplicateKey(payload, () =>
    ArticleModel.create({
      defaultLanguage: payload.defaultLanguage,
      translations: payload.translations,
      categoryId: payload.categoryId,
      authorId,
      tagIds: payload.tagIds,
      coverMediaId: payload.coverMediaId,
      isBreaking: payload.isBreaking,
      isFeatured: payload.isFeatured,
      isPremium: payload.isPremium,
      status: "draft",
    })
  );
  return toWire(doc);
}

export async function updateArticle(
  id: string,
  payload: ArticlePayload
): Promise<Article | null> {
  const doc = await ArticleModel.findById(id);
  if (!doc) {
    return null;
  }
  await assertSlugsAvailable(payload, id);
  doc.defaultLanguage = payload.defaultLanguage;
  doc.translations.clear();
  for (const [language, translation] of Object.entries(payload.translations)) {
    doc.translations.set(language, translation);
  }
  doc.set("categoryId", payload.categoryId);
  doc.set("tagIds", payload.tagIds);
  doc.set("coverMediaId", payload.coverMediaId ?? undefined);
  doc.isBreaking = payload.isBreaking;
  doc.isFeatured = payload.isFeatured;
  doc.isPremium = payload.isPremium;
  doc.markModified("translations");
  await mapDuplicateKey(payload, () => doc.save());
  return toWire(doc);
}

export async function setArticleStatus(
  id: string,
  status: "draft" | "published"
): Promise<Article | null> {
  const doc = await ArticleModel.findById(id);
  if (!doc) {
    return null;
  }
  doc.status = status;
  if (status === "published" && !doc.publishedAt) {
    doc.publishedAt = new Date();
  }
  await doc.save();
  return toWire(doc);
}

export async function deleteArticle(id: string): Promise<boolean> {
  const result = await ArticleModel.deleteOne({ _id: id });
  return result.deletedCount === 1;
}
