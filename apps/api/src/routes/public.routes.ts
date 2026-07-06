import { Router } from "express";
import {
  getArticleBySlug,
  getAuthorBySlug,
  getSiteConfig,
  listArticles,
  listArticlesByAuthor,
  listArticlesByCategory,
  listArticlesByTag,
  listCategories,
  listTags,
  searchArticles,
} from "../controllers/public.controller";
import { asyncHandler } from "../utils/async-handler";

export const publicRouter = Router();

publicRouter.get("/site", getSiteConfig);
publicRouter.get("/categories", asyncHandler(listCategories));
publicRouter.get("/tags", asyncHandler(listTags));
publicRouter.get("/articles", asyncHandler(listArticles));
publicRouter.get("/articles/search", asyncHandler(searchArticles));
publicRouter.get("/articles/by-category/:slug", asyncHandler(listArticlesByCategory));
publicRouter.get("/articles/by-tag/:slug", asyncHandler(listArticlesByTag));
publicRouter.get("/articles/by-author/:slug", asyncHandler(listArticlesByAuthor));
publicRouter.get("/articles/:slug", asyncHandler(getArticleBySlug));
publicRouter.get("/authors/:slug", asyncHandler(getAuthorBySlug));
