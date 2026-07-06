import { Schema, model, type InferSchemaType } from "mongoose";
import { userStatuses, type UserStatus } from "@salil-sandesh/shared";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    roleIds: { type: [{ type: Schema.Types.ObjectId, ref: "Role" }], required: true },
    status: {
      type: String,
      enum: userStatuses,
      required: true,
      default: "active" satisfies UserStatus,
    },
    slug: { type: String, required: true, unique: true, trim: true },
    avatarMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    bio: { type: String, trim: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
