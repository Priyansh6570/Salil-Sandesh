import { Router } from "express";
import {
  handleAdminCreateArticle,
  handleAdminDeleteArticle,
  handleAdminGetArticle,
  handleAdminListArticles,
  handleAdminUpdateArticle,
  makeStatusHandler,
} from "../controllers/admin-article.controller";
import { requireAuth, requirePermissions } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const adminRouter = Router();

adminRouter.use(requireAuth);

const anyArticlePermission = requirePermissions("article:edit");

adminRouter.get("/articles", anyArticlePermission, asyncHandler(handleAdminListArticles));
adminRouter.get("/articles/:id", anyArticlePermission, asyncHandler(handleAdminGetArticle));
adminRouter.post(
  "/articles",
  requirePermissions("article:create"),
  asyncHandler(handleAdminCreateArticle)
);
adminRouter.put(
  "/articles/:id",
  requirePermissions("article:edit"),
  asyncHandler(handleAdminUpdateArticle)
);
adminRouter.post(
  "/articles/:id/publish",
  requirePermissions("article:publish"),
  asyncHandler(makeStatusHandler("published"))
);
adminRouter.post(
  "/articles/:id/unpublish",
  requirePermissions("article:publish"),
  asyncHandler(makeStatusHandler("draft"))
);
adminRouter.delete(
  "/articles/:id",
  requirePermissions("article:delete"),
  asyncHandler(handleAdminDeleteArticle)
);
