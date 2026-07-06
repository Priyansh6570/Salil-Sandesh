import { Schema, model, type InferSchemaType } from "mongoose";

const tagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export type TagDoc = InferSchemaType<typeof tagSchema>;
export const TagModel = model("Tag", tagSchema);
