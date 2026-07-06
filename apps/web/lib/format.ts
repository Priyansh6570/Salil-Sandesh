import type { LanguageCode } from "@salil-sandesh/shared";

const locales: Partial<Record<LanguageCode, string>> = {
  hi: "hi-IN",
  en: "en-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  mr: "mr-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
  ur: "ur-IN",
};

export function formatDate(iso: string | undefined, lang?: LanguageCode): string {
  if (!iso) {
    return "";
  }
  return new Intl.DateTimeFormat(locales[lang ?? "hi"] ?? "hi-IN", {
    dateStyle: "long",
  }).format(new Date(iso));
}
