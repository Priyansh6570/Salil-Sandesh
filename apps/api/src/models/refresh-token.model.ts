import { Schema, model, type InferSchemaType } from "mongoose";
import { refreshTokenStatuses, type RefreshTokenStatus } from "@salil-sandesh/shared";

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: refreshTokenStatuses,
      required: true,
      default: "active" satisfies RefreshTokenStatus,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema);
