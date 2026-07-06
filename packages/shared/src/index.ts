export interface HealthResponse {
  ok: boolean;
}

export const languageCodes = ["hi", "en", "bn", "gu", "mr", "pa", "ta", "te", "ur"] as const;
export type LanguageCode = (typeof languageCodes)[number];
export const defaultLanguageCode: LanguageCode = "hi";

export const userStatuses = ["active", "blocked"] as const;
export type UserStatus = (typeof userStatuses)[number];

export const articleStatuses = ["draft", "published"] as const;
export type ArticleStatus = (typeof articleStatuses)[number];

export const mediaKinds = ["image"] as const;
export type MediaKind = (typeof mediaKinds)[number];

export const refreshTokenStatuses = ["active", "rotated", "revoked"] as const;
export type RefreshTokenStatus = (typeof refreshTokenStatuses)[number];

export const permissionCatalogue = [
  "article:create",
  "article:edit",
  "article:publish",
  "article:delete",
  "media:upload",
  "media:manage",
  "category:manage",
  "tag:manage",
  "user:manage",
  "role:manage",
] as const;
export type Permission = (typeof permissionCatalogue)[number];

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: TipTapMark[];
  content?: TipTapNode[];
  text?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  roleIds: string[];
  status: UserStatus;
  slug: string;
  avatarMediaId?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  systemLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleTranslation {
  title: string;
  excerpt: string;
  slug: string;
  body: TipTapNode;
}

export interface ArticleFlags {
  isBreaking: boolean;
  isFeatured: boolean;
  isPremium: boolean;
}

export interface Article extends ArticleFlags {
  id: string;
  defaultLanguage: LanguageCode;
  translations: Partial<Record<LanguageCode, ArticleTranslation>>;
  categoryId: string;
  authorId: string;
  tagIds: string[];
  coverMediaId?: string;
  status: ArticleStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  key: string;
  alt: string;
  width: number;
  height: number;
  kind: MediaKind;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
}

export interface OtpRequestAck {
  message: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  name: string;
  roles: string[];
  permissions: Permission[];
}

export interface SiteConfig {
  name: string;
  nameLatin: string;
  tagline: string;
  defaultLanguage: LanguageCode;
  languages: LanguageCode[];
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface TagRef {
  id: string;
  name: string;
  slug: string;
}

export interface AuthorRef {
  id: string;
  name: string;
  slug: string;
}

export interface MediaRef {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface AuthorPublic extends AuthorRef {
  bio?: string;
  avatar?: MediaRef;
}

export interface ArticleCard extends ArticleFlags {
  id: string;
  language: LanguageCode;
  availableLanguages: LanguageCode[];
  title: string;
  excerpt: string;
  slug: string;
  category: CategoryRef;
  author: AuthorRef;
  cover?: MediaRef;
  publishedAt?: string;
}

export interface ArticleDetail extends ArticleCard {
  body: TipTapNode;
  tags: TagRef[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  status: RefreshTokenStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
