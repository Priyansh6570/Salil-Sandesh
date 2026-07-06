import { Schema, model, type InferSchemaType } from "mongoose";
import { permissionCatalogue } from "@salil-sandesh/shared";

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    permissions: {
      type: [{ type: String, enum: permissionCatalogue }],
      required: true,
      default: [],
    },
    systemLocked: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export type RoleDoc = InferSchemaType<typeof roleSchema>;
export const RoleModel = model("Role", roleSchema);
