import type { MeResponse } from "@salil-sandesh/shared";
import { RoleModel, UserModel } from "../models";

export async function resolveUserAccess(userId: string): Promise<MeResponse | null> {
  const user = await UserModel.findById(userId);
  if (!user || user.status !== "active") {
    return null;
  }
  const roles = await RoleModel.find({ _id: { $in: user.roleIds } });
  const permissions = [...new Set(roles.flatMap((role) => role.permissions))];
  return {
    id: user.id,
    name: user.name,
    roles: roles.map((role) => role.name),
    permissions,
  };
}
