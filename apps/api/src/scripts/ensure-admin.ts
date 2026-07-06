import { permissionCatalogue } from "@salil-sandesh/shared";
import { connectDb } from "../config/db";
import { RoleModel, UserModel } from "../models";

async function main(): Promise<void> {
  const phone = process.argv[2];
  if (!phone || !/^\+[1-9][0-9]{9,14}$/.test(phone)) {
    throw new Error("usage: tsx src/scripts/ensure-admin.ts <phone in +E.164 format>");
  }
  const mongoose = await connectDb();
  const role = await RoleModel.findOneAndUpdate(
    { name: "admin" },
    { permissions: [...permissionCatalogue], systemLocked: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const user = await UserModel.findOneAndUpdate(
    { phone },
    {
      $setOnInsert: { name: "Administrator", slug: `admin-${phone.slice(-4)}` },
      $addToSet: { roleIds: role._id },
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(
    JSON.stringify({
      role: role.name,
      rolePermissions: role.permissions.length,
      userId: user.id,
      userName: user.name,
      userStatus: user.status,
    })
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
