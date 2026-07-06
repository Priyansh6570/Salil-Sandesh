import type {
  ArticleCard,
  ArticleDetail,
  AuthorPublic,
  Category,
  LanguageCode,
  Paginated,
  SiteConfig,
  Tag,
} from "@salil-sandesh/shared";

const apiBase = process.env.API_URL ?? "http://localhost:4000";

class ApiRequestError extends Error {
  constructor(public readonly status: number, path: string) {
    super(`api request failed with ${status} for ${path}`);
  }
}

async function fetchJson<T>(path: string, revalidate: number): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { next: { revalidate } });
  if (!response.ok) {
    throw new ApiRequestError(response.status, path);
  }
  return (await response.json()) as T;
}

async function fetchJsonOrNull<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    return await fetchJson<T>(path, revalidate);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export interface ArticleListParams {
  page?: number;
  limit?: number;
  lang?: LanguageCode;
  featured?: boolean;
  breaking?: boolean;
}

function listQuery(params: ArticleListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());
  if (params.lang) query.set("lang", params.lang);
  if (params.featured) query.set("featured", "true");
  if (params.breaking) query.set("breaking", "true");
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export function getSiteConfig(): Promise<SiteConfig> {
  return fetchJson("/site", 300);
}

export function getCategories(): Promise<Category[]> {
  return fetchJson("/categories", 300);
}

export function getTags(): Promise<Tag[]> {
  return fetchJson("/tags", 300);
}

export function getArticles(params: ArticleListParams = {}): Promise<Paginated<ArticleCard>> {
  return fetchJson(`/articles${listQuery(params)}`, 60);
}

export function getArticlesByCategory(
  slug: string,
  params: ArticleListParams = {}
): Promise<Paginated<ArticleCard> | null> {
  return fetchJsonOrNull(
    `/articles/by-category/${encodeURIComponent(slug)}${listQuery(params)}`,
    60
  );
}

export function getArticlesByTag(
  slug: string,
  params: ArticleListParams = {}
): Promise<Paginated<ArticleCard> | null> {
  return fetchJsonOrNull(`/articles/by-tag/${encodeURIComponent(slug)}${listQuery(params)}`, 60);
}

export function getArticlesByAuthor(
  slug: string,
  params: ArticleListParams = {}
): Promise<Paginated<ArticleCard> | null> {
  return fetchJsonOrNull(
    `/articles/by-author/${encodeURIComponent(slug)}${listQuery(params)}`,
    60
  );
}

export function searchArticles(
  q: string,
  params: ArticleListParams = {}
): Promise<Paginated<ArticleCard>> {
  const query = listQuery(params);
  const separator = query ? "&" : "?";
  return fetchJson(`/articles/search${query}${separator}q=${encodeURIComponent(q)}`, 0);
}

export function getArticleBySlug(
  slug: string,
  lang?: LanguageCode
): Promise<ArticleDetail | null> {
  const query = lang ? `?lang=${lang}` : "";
  return fetchJsonOrNull(`/articles/${encodeURIComponent(slug)}${query}`, 60);
}

export function getAuthorBySlug(slug: string): Promise<AuthorPublic | null> {
  return fetchJsonOrNull(`/authors/${encodeURIComponent(slug)}`, 300);
}
