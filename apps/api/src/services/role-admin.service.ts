import {
  permissionCatalogue,
  type PermissionCatalogueEntry,
  type Permission,
  type RoleSummary,
} from "@salil-sandesh/shared";
import type { HydratedDocument } from "mongoose";
import { RoleModel, UserModel, type RoleDoc } from "../models";

const adminPermission = "role:manage";

async function activeAdminsExistWithout(excludeRoleId: string): Promise<boolean> {
  const otherAdminRoles = await RoleModel.find({
    _id: { $ne: excludeRoleId },
    permissions: adminPermission,
  });
  if (otherAdminRoles.length === 0) {
    return false;
  }
  const count = await UserModel.countDocuments({
    status: "active",
    roleIds: { $in: otherAdminRoles.map((role) => role._id) },
  });
  return count > 0;
}

export class RoleConflictError extends Error {}
export class RoleLockedError extends Error {}
export class RoleInUseError extends Error {}
export class LastAdminRoleError extends Error {}

const permissionGroups: Record<Permission, string> = {
  "article:create": "लेख",
  "article:edit": "लेख",
  "article:publish": "लेख",
  "article:delete": "लेख",
  "media:upload": "मीडिया",
  "media:manage": "मीडिया",
  "category:manage": "वर्गीकरण",
  "tag:manage": "वर्गीकरण",
  "user:manage": "प्रशासन",
  "role:manage": "प्रशासन",
};

export function permissionCatalogueEntries(): PermissionCatalogueEntry[] {
  return permissionCatalogue.map((key) => ({ key, group: permissionGroups[key] }));
}

function toSummary(doc: HydratedDocument<RoleDoc>): RoleSummary {
  return {
    id: doc.id,
    name: doc.name,
    permissions: doc.permissions as Permission[],
    systemLocked: doc.systemLocked,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listRoles(): Promise<RoleSummary[]> {
  const docs = await RoleModel.find().sort({ name: 1 });
  return docs.map(toSummary);
}

export async function createRole(input: {
  name: string;
  permissions: Permission[];
}): Promise<RoleSummary> {
  const existing = await RoleModel.findOne({ name: input.name });
  if (existing) {
    throw new RoleConflictError("a role with this name already exists");
  }
  const doc = await RoleModel.create({
    name: input.name,
    permissions: input.permissions,
    systemLocked: false,
  });
  return toSummary(doc);
}

export async function updateRole(
  id: string,
  input: { name: string; permissions: Permission[] }
): Promise<RoleSummary | null> {
  const doc = await RoleModel.findById(id);
  if (!doc) {
    return null;
  }
  if (doc.systemLocked) {
    throw new RoleLockedError("system roles cannot be modified");
  }
  const nameConflict = await RoleModel.findOne({ name: input.name, _id: { $ne: id } });
  if (nameConflict) {
    throw new RoleConflictError("a role with this name already exists");
  }
  const removesAdmin =
    doc.permissions.includes(adminPermission) && !input.permissions.includes(adminPermission);
  if (removesAdmin) {
    const hasActiveAdminRole = await UserModel.exists({ status: "active", roleIds: doc._id });
    if (hasActiveAdminRole && !(await activeAdminsExistWithout(id))) {
      throw new LastAdminRoleError(
        "cannot remove administrator access from the last role that grants it"
      );
    }
  }
  doc.name = input.name;
  doc.set("permissions", input.permissions);
  await doc.save();
  return toSummary(doc);
}

export async function deleteRole(id: string): Promise<boolean> {
  const doc = await RoleModel.findById(id);
  if (!doc) {
    return false;
  }
  if (doc.systemLocked) {
    throw new RoleLockedError("system roles cannot be deleted");
  }
  const inUse = await UserModel.exists({ roleIds: id });
  if (inUse) {
    throw new RoleInUseError("cannot delete a role that is assigned to users");
  }
  await RoleModel.deleteOne({ _id: id });
  return true;
}
