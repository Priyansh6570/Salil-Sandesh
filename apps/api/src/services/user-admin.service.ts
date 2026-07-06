import type { RoleRef, UserSummary } from "@salil-sandesh/shared";
import type { HydratedDocument } from "mongoose";
import { RoleModel, UserModel, type UserDoc } from "../models";

export class UserConflictError extends Error {}
export class SelfLockoutError extends Error {}
export class LastAdminError extends Error {}
export class UnknownRoleError extends Error {}

const adminPermission = "role:manage";

async function rolesByIds(ids: string[]): Promise<Map<string, RoleRef>> {
  const roles = await RoleModel.find({ _id: { $in: ids } });
  return new Map(roles.map((role) => [role.id, { id: role.id, name: role.name }]));
}

function toSummary(doc: HydratedDocument<UserDoc>, roleRefs: Map<string, RoleRef>): UserSummary {
  return {
    id: doc.id,
    name: doc.name,
    phone: doc.phone,
    slug: doc.slug,
    status: doc.status,
    roles: doc.roleIds.flatMap((roleId) => {
      const ref = roleRefs.get(roleId.toString());
      return ref ? [ref] : [];
    }),
    createdAt: doc.createdAt.toISOString(),
  };
}

async function summarize(docs: HydratedDocument<UserDoc>[]): Promise<UserSummary[]> {
  const roleIds = [...new Set(docs.flatMap((doc) => doc.roleIds.map((id) => id.toString())))];
  const roleRefs = await rolesByIds(roleIds);
  return docs.map((doc) => toSummary(doc, roleRefs));
}

async function assertRolesExist(roleIds: string[]): Promise<void> {
  const count = await RoleModel.countDocuments({ _id: { $in: roleIds } });
  if (count !== new Set(roleIds).size) {
    throw new UnknownRoleError("one or more roles do not exist");
  }
}

async function adminRoleIds(): Promise<Set<string>> {
  const roles = await RoleModel.find({ permissions: adminPermission });
  return new Set(roles.map((role) => role.id));
}

async function countOtherActiveAdmins(excludeUserId: string): Promise<number> {
  const adminIds = [...(await adminRoleIds())];
  return UserModel.countDocuments({
    _id: { $ne: excludeUserId },
    status: "active",
    roleIds: { $in: adminIds },
  });
}

async function userHasAdminRole(roleIds: string[]): Promise<boolean> {
  const adminIds = await adminRoleIds();
  return roleIds.some((id) => adminIds.has(id));
}

function slugify(name: string, phone: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "staff"}-${phone.slice(-4)}`;
}

export async function listUsers(): Promise<UserSummary[]> {
  const docs = await UserModel.find().sort({ createdAt: -1 });
  return summarize(docs);
}

export async function createUser(input: {
  name: string;
  phone: string;
  roleIds: string[];
  bio?: string;
}): Promise<UserSummary> {
  await assertRolesExist(input.roleIds);
  const existing = await UserModel.findOne({ phone: input.phone });
  if (existing) {
    throw new UserConflictError("a user with this phone already exists");
  }
  const doc = await UserModel.create({
    name: input.name,
    phone: input.phone,
    roleIds: input.roleIds,
    slug: slugify(input.name, input.phone),
    bio: input.bio,
    status: "active",
  });
  return (await summarize([doc]))[0]!;
}

export async function updateUser(
  actingUserId: string,
  targetId: string,
  input: { name: string; roleIds: string[]; bio?: string }
): Promise<UserSummary | null> {
  await assertRolesExist(input.roleIds);
  const doc = await UserModel.findById(targetId);
  if (!doc) {
    return null;
  }
  const targetWasAdmin = await userHasAdminRole(doc.roleIds.map((id) => id.toString()));
  const targetWillBeAdmin = await userHasAdminRole(input.roleIds);
  if (
    actingUserId === targetId &&
    targetWasAdmin &&
    !targetWillBeAdmin
  ) {
    throw new SelfLockoutError("you cannot remove your own administrator role");
  }
  if (
    targetWasAdmin &&
    !targetWillBeAdmin &&
    doc.status === "active" &&
    (await countOtherActiveAdmins(targetId)) === 0
  ) {
    throw new LastAdminError("cannot remove the administrator role from the last admin");
  }
  doc.name = input.name;
  doc.set("roleIds", input.roleIds);
  doc.set("bio", input.bio ?? undefined);
  await doc.save();
  return (await summarize([doc]))[0]!;
}

export async function setUserStatus(
  actingUserId: string,
  targetId: string,
  status: "active" | "blocked"
): Promise<UserSummary | null> {
  const doc = await UserModel.findById(targetId);
  if (!doc) {
    return null;
  }
  if (actingUserId === targetId && status === "blocked") {
    throw new SelfLockoutError("you cannot deactivate your own account");
  }
  if (status === "blocked" && doc.status === "active") {
    const targetIsAdmin = await userHasAdminRole(doc.roleIds.map((id) => id.toString()));
    if (targetIsAdmin && (await countOtherActiveAdmins(targetId)) === 0) {
      throw new LastAdminError("cannot deactivate the last admin");
    }
  }
  doc.status = status;
  await doc.save();
  return (await summarize([doc]))[0]!;
}
