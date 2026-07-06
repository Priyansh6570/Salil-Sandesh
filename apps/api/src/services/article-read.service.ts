import type {
  ArticleCard,
  ArticleDetail,
  AuthorRef,
  CategoryRef,
  LanguageCode,
  MediaRef,
  Paginated,
  TagRef,
  TipTapNode,
} from "@salil-sandesh/shared";
import { languageCodes } from "@salil-sandesh/shared";
import { collectImageMediaIds } from "@salil-sandesh/editor-config";
import type { FilterQuery, HydratedDocument } from "mongoose";
import {
  ArticleModel,
  CategoryModel,
  MediaModel,
  TagModel,
  UserModel,
  type ArticleDoc,
} from "../models";
import { resolveTranslation } from "../utils/language";
import { mediaUrlFromKey } from "../utils/media-url";

type ArticleHydrated = HydratedDocument<ArticleDoc>;

export interface ListOptions {
  page: number;
  limit: number;
  lang?: LanguageCode;
  filter?: FilterQuery<ArticleDoc>;
}

interface CardContext {
  categories: Map<string, CategoryRef>;
  authors: Map<string, AuthorRef>;
  media: Map<string, MediaRef>;
}

function idsOf(values: Array<{ toString(): string } | undefined | null>): string[] {
  return [...new Set(values.flatMap((value) => (value ? [value.toString()] : [])))];
}

async function loadCardContext(docs: ArticleHydrated[]): Promise<CardContext> {
  const categoryIds = idsOf(docs.map((doc) => doc.categoryId));
  const authorIds = idsOf(docs.map((doc) => doc.authorId));
  const coverIds = idsOf(docs.map((doc) => doc.coverMediaId));
  const [categories, authors, media] = await Promise.all([
    CategoryModel.find({ _id: { $in: categoryIds } }),
    UserModel.find({ _id: { $in: authorIds } }),
    coverIds.length > 0 ? MediaModel.find({ _id: { $in: coverIds } }) : [],
  ]);
  return {
    categories: new Map(
      categories.map((doc) => [doc.id, { id: doc.id, name: doc.name, slug: doc.slug }])
    ),
    authors: new Map(
      authors.map((doc) => [doc.id, { id: doc.id, name: doc.name, slug: doc.slug }])
    ),
    media: new Map(
      media.map((doc) => [
        doc.id,
        { url: mediaUrlFromKey(doc.key), width: doc.width, height: doc.height, alt: doc.alt },
      ])
    ),
  };
}

function toCard(doc: ArticleHydrated, context: CardContext, lang?: LanguageCode): ArticleCard {
  const { language, availableLanguages, translation } = resolveTranslation(doc, lang);
  const categoryId = doc.categoryId.toString();
  const authorId = doc.authorId.toString();
  const coverId = doc.coverMediaId?.toString();
  return {
    id: doc.id,
    language,
    availableLanguages,
    title: translation.title,
    excerpt: translation.excerpt,
    slug: translation.slug,
    category: context.categories.get(categoryId) ?? { id: categoryId, name: "", slug: "" },
    author: context.authors.get(authorId) ?? { id: authorId, name: "", slug: "" },
    cover: coverId ? context.media.get(coverId) : undefined,
    isBreaking: doc.isBreaking,
    isFeatured: doc.isFeatured,
    isPremium: doc.isPremium,
    publishedAt: doc.publishedAt?.toISOString(),
  };
}

export async function buildCards(
  docs: ArticleHydrated[],
  lang?: LanguageCode
): Promise<ArticleCard[]> {
  const context = await loadCardContext(docs);
  return docs.map((doc) => toCard(doc, context, lang));
}

export async function listPublishedArticles(
  options: ListOptions
): Promise<Paginated<ArticleCard>> {
  const filter: FilterQuery<ArticleDoc> = { ...options.filter, status: "published" };
  const skip = (options.page - 1) * options.limit;
  const [docs, total] = await Promise.all([
    ArticleModel.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(options.limit),
    ArticleModel.countDocuments(filter),
  ]);
  return {
    items: await buildCards(docs, options.lang),
    page: options.page,
    limit: options.limit,
    total,
  };
}

export async function searchPublishedArticles(
  q: string,
  options: ListOptions
): Promise<Paginated<ArticleCard>> {
  return listPublishedArticles({ ...options, filter: { ...options.filter, $text: { $search: q } } });
}

function slugMatchFilter(slug: string): FilterQuery<ArticleDoc> {
  return {
    status: "published",
    $or: languageCodes.map((code) => ({ [`translations.${code}.slug`]: slug })),
  };
}

export async function getPublishedArticleBySlug(
  slug: string,
  lang?: LanguageCode
): Promise<ArticleDetail | null> {
  const doc = await ArticleModel.findOne(slugMatchFilter(slug));
  if (!doc) {
    return null;
  }
  const [cards, tags] = await Promise.all([
    buildCards([doc], lang),
    doc.tagIds.length > 0 ? TagModel.find({ _id: { $in: doc.tagIds } }) : [],
  ]);
  const card = cards[0];
  if (!card) {
    return null;
  }
  const { translation } = resolveTranslation(doc, lang);
  const tagRefs: TagRef[] = tags.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug }));
  const body = await resolveInlineImages(translation.body as TipTapNode);
  return { ...card, body, tags: tagRefs };
}

async function resolveInlineImages(body: TipTapNode): Promise<TipTapNode> {
  const mediaIds = collectImageMediaIds(body);
  if (mediaIds.length === 0) {
    return body;
  }
  const media = await MediaModel.find({ _id: { $in: mediaIds } });
  const byId = new Map(
    media.map((doc) => [
      doc.id,
      { url: mediaUrlFromKey(doc.key), width: doc.width, height: doc.height, alt: doc.alt },
    ])
  );
  const transform = (node: TipTapNode): TipTapNode | null => {
    if (node.type === "image") {
      const mediaId = typeof node.attrs?.mediaId === "string" ? node.attrs.mediaId : undefined;
      const resolved = mediaId ? byId.get(mediaId) : undefined;
      if (!resolved) {
        return null;
      }
      const altAttr = typeof node.attrs?.alt === "string" && node.attrs.alt.length > 0
        ? node.attrs.alt
        : resolved.alt;
      return {
        type: "image",
        attrs: {
          src: resolved.url,
          alt: altAttr,
          width: resolved.width,
          height: resolved.height,
        },
      };
    }
    if (!node.content) {
      return node;
    }
    return {
      ...node,
      content: node.content
        .map(transform)
        .filter((child): child is TipTapNode => child !== null),
    };
  };
  return transform(body) ?? body;
}
