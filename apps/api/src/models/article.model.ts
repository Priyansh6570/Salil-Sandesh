import { Schema, model, type InferSchemaType } from "mongoose";
import {
  articleStatuses,
  defaultLanguageCode,
  languageCodes,
  type ArticleStatus,
} from "@salil-sandesh/shared";

const translationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    body: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const knownLanguages: readonly string[] = languageCodes;

const articleSchema = new Schema(
  {
    defaultLanguage: {
      type: String,
      enum: languageCodes,
      required: true,
      default: defaultLanguageCode,
    },
    translations: {
      type: Map,
      of: translationSchema,
      required: true,
      validate: {
        validator: (value: Map<string, unknown>) =>
          value.size > 0 && [...value.keys()].every((key) => knownLanguages.includes(key)),
        message: "translations must be non-empty and keyed by supported language codes",
      },
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tagIds: { type: [{ type: Schema.Types.ObjectId, ref: "Tag" }], required: true, default: [] },
    coverMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    isBreaking: { type: Boolean, required: true, default: false },
    isFeatured: { type: Boolean, required: true, default: false },
    isPremium: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: articleStatuses,
      required: true,
      default: "draft" satisfies ArticleStatus,
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

articleSchema.pre("validate", function (next) {
  if (this.translations && !this.translations.get(this.defaultLanguage)) {
    next(new Error(`missing translation for default language ${this.defaultLanguage}`));
    return;
  }
  next();
});

export type ArticleDoc = InferSchemaType<typeof articleSchema>;
export const ArticleModel = model("Article", articleSchema);
