import type { LanguageCode } from "@salil-sandesh/shared";
import type { ArticleDoc } from "../models";

type TranslationEntry = NonNullable<ReturnType<ArticleDoc["translations"]["get"]>>;

export interface ResolvedTranslation {
  language: LanguageCode;
  availableLanguages: LanguageCode[];
  translation: TranslationEntry;
}

export function resolveTranslation(
  article: Pick<ArticleDoc, "translations" | "defaultLanguage">,
  requested?: LanguageCode
): ResolvedTranslation {
  const availableLanguages = [...article.translations.keys()] as LanguageCode[];
  const language =
    requested && article.translations.has(requested) ? requested : article.defaultLanguage;
  const translation = article.translations.get(language);
  if (!translation) {
    throw new Error(`article is missing its default-language translation ${language}`);
  }
  return { language, availableLanguages, translation };
}
