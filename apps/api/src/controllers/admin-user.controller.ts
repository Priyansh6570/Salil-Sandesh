import type { Request, Response } from "express";
import { z } from "zod";
import { permissionCatalogue, type ApiError } from "@salil-sandesh/shared";
import { authUserId } from "../middleware/auth";
import {
  createRole,
  deleteRole,
  LastAdminRoleError,
  permissionCatalogueEntries,
  RoleConflictError,
  RoleInUseError,
  RoleLockedError,
  listRoles,
  updateRole,
} from "../services/role-admin.service";
import {
  createUser,
  LastAdminError,
  listUsers,
  SelfLockoutError,
  setUserStatus,
  UnknownRoleError,
  updateUser,
  UserConflictError,
} from "../services/user-admin.service";

const objectId = z.string().regex(/^[0-9a-f]{24}$/);
const phone = z.string().regex(/^\+[1-9][0-9]{9,14}$/);
const name = z.string().trim().min(1).max(120);
const bio = z.string().trim().max(500).optional();
const permission = z.enum(permissionCatalogue);

const createUserSchema = z.object({
  name,
  phone,
  roleIds: z.array(objectId).min(1).max(20),
  bio,
});
const updateUserSchema = z.object({
  name,
  roleIds: z.array(objectId).min(1).max(20),
  bio,
});
const statusSchema = z.object({ status: z.enum(["active", "blocked"]) });
const roleSchema = z.object({
  name: z.string().trim().min(1).max(60),
  permissions: z.array(permission).max(permissionCatalogue.length),
});

function invalid(res: Response, message: string): void {
  res.status(400).json({ error: message } satisfies ApiError);
}

function conflict(res: Response, message: string): void {
  res.status(409).json({ error: message } satisfies ApiError);
}

function notFound(res: Response): void {
  res.status(404).json({ error: "not found" } satisfies ApiError);
}

export async function handleListUsers(_req: Request, res: Response): Promise<void> {
  res.json(await listUsers());
}

export async function handleCreateUser(req: Request, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    invalid(res, parsed.error.issues[0]?.message ?? "invalid user payload");
    return;
  }
  try {
    res.status(201).json(await createUser(parsed.data));
  } catch (error) {
    if (error instanceof UserConflictError) {
      conflict(res, error.message);
      return;
    }
    if (error instanceof UnknownRoleError) {
      invalid(res, error.message);
      return;
    }
    throw error;
  }
}

export async function handleUpdateUser(req: Request, res: Response): Promise<void> {
  const id = objectId.safeParse(req.params.id);
  if (!id.success) {
    notFound(res);
    return;
  }
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    invalid(res, parsed.error.issues[0]?.message ?? "invalid user payload");
    return;
  }
  const actingUserId = authUserId(req);
  if (!actingUserId) {
    res.status(401).json({ error: "unauthorized" } satisfies ApiError);
    return;
  }
  try {
    const user = await updateUser(actingUserId, id.data, parsed.data);
    if (!user) {
      notFound(res);
      return;
    }
    res.json(user);
  } catch (error) {
    if (error instanceof SelfLockoutError || error instanceof LastAdminError) {
      conflict(res, error.message);
      return;
    }
    if (error instanceof UnknownRoleError) {
      invalid(res, error.message);
      return;
    }
    throw error;
  }
}

export async function handleSetUserStatus(req: Request, res: Response): Promise<void> {
  const id = objectId.safeParse(req.params.id);
  if (!id.success) {
    notFound(res);
    return;
  }
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    invalid(res, "invalid status");
    return;
  }
  const actingUserId = authUserId(req);
  if (!actingUserId) {
    res.status(401).json({ error: "unauthorized" } satisfies ApiError);
    return;
  }
  try {
    const user = await setUserStatus(actingUserId, id.data, parsed.data.status);
    if (!user) {
      notFound(res);
      return;
    }
    res.json(user);
  } catch (error) {
    if (error instanceof SelfLockoutError || error instanceof LastAdminError) {
      conflict(res, error.message);
      return;
    }
    throw error;
  }
}

export function handlePermissionCatalogue(_req: Request, res: Response): void {
  res.json(permissionCatalogueEntries());
}

export async function handleListRoles(_req: Request, res: Response): Promise<void> {
  res.json(await listRoles());
}

export async function handleCreateRole(req: Request, res: Response): Promise<void> {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    invalid(res, parsed.error.issues[0]?.message ?? "invalid role payload");
    return;
  }
  try {
    res.status(201).json(await createRole(parsed.data));
  } catch (error) {
    if (error instanceof RoleConflictError) {
      conflict(res, error.message);
      return;
    }
    throw error;
  }
}

export async function handleUpdateRole(req: Request, res: Response): Promise<void> {
  const id = objectId.safeParse(req.params.id);
  if (!id.success) {
    notFound(res);
    return;
  }
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    invalid(res, parsed.error.issues[0]?.message ?? "invalid role payload");
    return;
  }
  try {
    const role = await updateRole(id.data, parsed.data);
    if (!role) {
      notFound(res);
      return;
    }
    res.json(role);
  } catch (error) {
    if (
      error instanceof RoleLockedError ||
      error instanceof RoleConflictError ||
      error instanceof LastAdminRoleError
    ) {
      conflict(res, error.message);
      return;
    }
    throw error;
  }
}

export async function handleDeleteRole(req: Request, res: Response): Promise<void> {
  const id = objectId.safeParse(req.params.id);
  if (!id.success) {
    notFound(res);
    return;
  }
  try {
    const deleted = await deleteRole(id.data);
    if (!deleted) {
      notFound(res);
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleLockedError || error instanceof RoleInUseError) {
      conflict(res, error.message);
      return;
    }
    throw error;
  }
}
