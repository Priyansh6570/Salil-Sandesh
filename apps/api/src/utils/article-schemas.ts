import { z } from "zod";
import { languageCodes, type TipTapNode } from "@salil-sandesh/shared";
import { validateArticleBody } from "@salil-sandesh/editor-config";

export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/);

const bodySchema = z.custom<TipTapNode>().superRefine((value, context) => {
  for (const violation of validateArticleBody(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: violation });
  }
});

const translationSchema = z.object({
  title: z.string().trim().min(1).max(300),
  excerpt: z.string().trim().min(1).max(500),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body: bodySchema,
});

const translationsSchema = z
  .record(z.enum(languageCodes), translationSchema)
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one translation is required",
  });

export const articlePayloadSchema = z
  .object({
    defaultLanguage: z.enum(languageCodes),
    translations: translationsSchema,
    categoryId: objectIdSchema,
    tagIds: z.array(objectIdSchema).max(20).default([]),
    coverMediaId: objectIdSchema.optional(),
    isBreaking: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    isPremium: z.boolean().default(false),
  })
  .refine((value) => value.translations[value.defaultLanguage] !== undefined, {
    message: "translations must include the default language",
  });

export type ArticlePayload = z.output<typeof articlePayloadSchema>;

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["draft", "published"]).optional(),
});
