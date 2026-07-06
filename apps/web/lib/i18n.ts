import { languageCodes, type LanguageCode } from "@salil-sandesh/shared";

const hi = {
  featured: "प्रमुख समाचार",
  latest: "ताज़ा खबरें",
  breaking: "ब्रेकिंग",
  premium: "प्रीमियम",
  search: "खोजें",
  searchPlaceholder: "समाचार खोजें…",
  searchResultsFor: "खोज परिणाम:",
  noArticles: "कोई लेख नहीं मिला।",
  home: "मुखपृष्ठ",
  sections: "अनुभाग",
  tags: "टैग",
  authorLabel: "लेखक",
  availableIn: "भाषाएँ:",
  previous: "पिछला",
  next: "अगला",
  pageLabel: "पृष्ठ",
  about: "हमारे बारे में",
  contact: "संपर्क",
  privacy: "गोपनीयता नीति",
  terms: "नियम व शर्तें",
  notFoundTitle: "पृष्ठ नहीं मिला",
  notFoundBody: "आप जिस पृष्ठ की तलाश में हैं वह मौजूद नहीं है।",
  backHome: "मुखपृष्ठ पर लौटें",
  unsupportedContent: "असमर्थित सामग्री",
};

export type UiDictionary = typeof hi;

const en: UiDictionary = {
  featured: "Featured",
  latest: "Latest news",
  breaking: "Breaking",
  premium: "Premium",
  search: "Search",
  searchPlaceholder: "Search the news…",
  searchResultsFor: "Search results:",
  noArticles: "No articles found.",
  home: "Home",
  sections: "Sections",
  tags: "Tags",
  authorLabel: "Author",
  availableIn: "Languages:",
  previous: "Previous",
  next: "Next",
  pageLabel: "Page",
  about: "About us",
  contact: "Contact",
  privacy: "Privacy policy",
  terms: "Terms of use",
  notFoundTitle: "Page not found",
  notFoundBody: "The page you are looking for does not exist.",
  backHome: "Back to home",
  unsupportedContent: "Unsupported content",
};

const dictionaries: Partial<Record<LanguageCode, UiDictionary>> = { hi, en };

export const languageNames: Record<LanguageCode, string> = {
  hi: "हिन्दी",
  en: "English",
  bn: "বাংলা",
  gu: "ગુજરાતી",
  mr: "मराठी",
  pa: "ਪੰਜਾਬੀ",
  ta: "தமிழ்",
  te: "తెలుగు",
  ur: "اردو",
};

export function parseLang(value: string | string[] | undefined): LanguageCode | undefined {
  return typeof value === "string" && (languageCodes as readonly string[]).includes(value)
    ? (value as LanguageCode)
    : undefined;
}

export function parsePage(value: string | string[] | undefined): number {
  const page = typeof value === "string" ? Number.parseInt(value, 10) : 1;
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}

export function getDictionary(lang?: LanguageCode): UiDictionary {
  return (lang && dictionaries[lang]) || hi;
}
