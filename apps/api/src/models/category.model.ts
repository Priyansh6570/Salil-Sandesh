import { Schema, model, type InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
  },
  { timestamps: true }
);

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const CategoryModel = model("Category", categorySchema);
