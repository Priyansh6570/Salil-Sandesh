import { Schema, model, type InferSchemaType } from "mongoose";
import { mediaKinds, type MediaKind } from "@salil-sandesh/shared";

const mediaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    alt: { type: String, default: "", trim: true },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    kind: {
      type: String,
      enum: mediaKinds,
      required: true,
      default: "image" satisfies MediaKind,
    },
  },
  { timestamps: true }
);

export type MediaDoc = InferSchemaType<typeof mediaSchema>;
export const MediaModel = model("Media", mediaSchema);
