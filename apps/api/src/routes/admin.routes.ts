import { Router } from "express";
import {
  handleAdminCreateArticle,
  handleAdminDeleteArticle,
  handleAdminGetArticle,
  handleAdminListArticles,
  handleAdminUpdateArticle,
  makeStatusHandler,
} from "../controllers/admin-article.controller";
import {
  handleDeleteMedia,
  handleListMedia,
  handleUploadMedia,
} from "../controllers/media.controller";
import {
  handleCreateRole,
  handleCreateUser,
  handleDeleteRole,
  handleListRoles,
  handleListUsers,
  handlePermissionCatalogue,
  handleSetUserStatus,
  handleUpdateRole,
  handleUpdateUser,
} from "../controllers/admin-user.controller";
import { requireAuth, requirePermissions } from "../middleware/auth";
import { uploadImageMiddleware } from "../middleware/upload";
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

adminRouter.get(
  "/media",
  requirePermissions("media:upload"),
  asyncHandler(handleListMedia)
);
adminRouter.post(
  "/media",
  requirePermissions("media:upload"),
  uploadImageMiddleware,
  asyncHandler(handleUploadMedia)
);
adminRouter.delete(
  "/media/:id",
  requirePermissions("media:manage"),
  asyncHandler(handleDeleteMedia)
);

const manageUsers = requirePermissions("user:manage");
adminRouter.get("/users", manageUsers, asyncHandler(handleListUsers));
adminRouter.post("/users", manageUsers, asyncHandler(handleCreateUser));
adminRouter.put("/users/:id", manageUsers, asyncHandler(handleUpdateUser));
adminRouter.post("/users/:id/status", manageUsers, asyncHandler(handleSetUserStatus));

const manageRoles = requirePermissions("role:manage");
adminRouter.get("/permissions", manageRoles, handlePermissionCatalogue);
adminRouter.get("/roles", manageRoles, asyncHandler(handleListRoles));
adminRouter.post("/roles", manageRoles, asyncHandler(handleCreateRole));
adminRouter.put("/roles/:id", manageRoles, asyncHandler(handleUpdateRole));
adminRouter.delete("/roles/:id", manageRoles, asyncHandler(handleDeleteRole));
