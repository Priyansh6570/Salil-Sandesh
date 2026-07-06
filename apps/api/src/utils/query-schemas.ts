import { z } from "zod";
import { languageCodes } from "@salil-sandesh/shared";

export const langQuerySchema = z.object({
  lang: z.enum(languageCodes).optional(),
});

export const pageQuerySchema = langQuerySchema.extend({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  featured: z.literal("true").optional(),
  breaking: z.literal("true").optional(),
});

export const searchQuerySchema = pageQuerySchema.extend({
  q: z.string().min(1).max(100),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(300),
});
