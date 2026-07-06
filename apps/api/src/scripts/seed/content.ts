import type { LanguageCode, TipTapNode } from "@salil-sandesh/shared";
import type { NewsArticle } from "./news-client";

export interface CategoryDefinition {
  slug: string;
  name: string;
  englishName: string;
  order: number;
  newsCategories: string[];
}

export const categoryDefinitions: CategoryDefinition[] = [
  { slug: "pramukh", name: "प्रमुख", englishName: "Top", order: 1, newsCategories: ["top"] },
  { slug: "rashtriya", name: "राष्ट्रीय", englishName: "National", order: 2, newsCategories: ["politics", "domestic"] },
  { slug: "vishwa", name: "विश्व", englishName: "World", order: 3, newsCategories: ["world"] },
  { slug: "vyapar", name: "व्यापार", englishName: "Business", order: 4, newsCategories: ["business"] },
  { slug: "khel", name: "खेल", englishName: "Sports", order: 5, newsCategories: ["sports"] },
  { slug: "manoranjan", name: "मनोरंजन", englishName: "Entertainment", order: 6, newsCategories: ["entertainment"] },
  { slug: "takneek", name: "तकनीक", englishName: "Technology", order: 7, newsCategories: ["technology", "science"] },
  { slug: "swasthya", name: "स्वास्थ्य", englishName: "Health", order: 8, newsCategories: ["health"] },
];

const fallbackCategory = categoryDefinitions[0]!;

export function categoryForNews(newsCategory: string): CategoryDefinition {
  return (
    categoryDefinitions.find((definition) =>
      definition.newsCategories.includes(newsCategory)
    ) ?? fallbackCategory
  );
}

const transliterationMap: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ए: "e", ऐ: "ai", ओ: "o", औ: "au",
  क: "k", ख: "kh", ग: "g", घ: "gh", च: "ch", छ: "chh", ज: "j", झ: "jh", ट: "t", ठ: "th",
  ड: "d", ढ: "dh", ण: "n", त: "t", थ: "th", द: "d", ध: "dh", न: "n", प: "p", फ: "ph",
  ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", व: "v", श: "sh", ष: "sh", स: "s",
  ह: "h", क्ष: "ksh", त्र: "tr", ज्ञ: "gy", ड़: "r", ढ़: "rh", फ़: "f", ज़: "z",
};

function transliterate(text: string): string {
  let output = "";
  for (const char of text) {
    if (transliterationMap[char]) {
      output += transliterationMap[char];
    } else if (/[a-z0-9]/i.test(char)) {
      output += char.toLowerCase();
    } else if (/\s|-/.test(char)) {
      output += "-";
    }
  }
  return output;
}

export function slugFrom(title: string, articleId: string): string {
  const base = transliterate(title)
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const suffix = articleId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase() || "000000";
  return `${base || "samachar"}-${suffix}`;
}

function paragraph(text: string): TipTapNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function heading(text: string): TipTapNode {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function bulletList(items: string[]): TipTapNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
  };
}

function blockquote(text: string): TipTapNode {
  return { type: "blockquote", content: [paragraph(text)] };
}

export function hindiBody(article: NewsArticle, categoryName: string): TipTapNode {
  const intro = article.description;
  const highlights = [
    `${categoryName} क्षेत्र में यह घटनाक्रम चर्चा का विषय बना हुआ है।`,
    "विशेषज्ञों के अनुसार आने वाले दिनों में इसके व्यापक प्रभाव देखने को मिल सकते हैं।",
    "संबंधित पक्षों ने स्थिति पर करीबी नज़र रखने की बात कही है।",
  ];
  return {
    type: "doc",
    content: [
      paragraph(intro),
      heading("मुख्य बिंदु"),
      bulletList(highlights),
      paragraph(
        `${article.sourceName} की रिपोर्ट के अनुसार, इस विषय पर विस्तृत जानकारी सामने आ रही है और घटनाक्रम पर लगातार अपडेट जारी हैं।`
      ),
      blockquote("पाठकों की प्रतिक्रिया और आधिकारिक बयान इस रिपोर्ट का हिस्सा बनते रहेंगे।"),
      paragraph(
        "सलिल संदेश इस समाचार से जुड़े हर महत्वपूर्ण पहलू पर आपको सटीक और संतुलित जानकारी देता रहेगा।"
      ),
    ],
  };
}

export function englishBody(title: string, description: string): TipTapNode {
  return {
    type: "doc",
    content: [
      paragraph(description),
      heading("Key points"),
      bulletList([
        "The development has drawn significant attention across the sector.",
        "Analysts expect wider effects to unfold in the coming days.",
        "Stakeholders say they are monitoring the situation closely.",
      ]),
      paragraph(
        "Salil Sandesh will continue to bring you accurate and balanced coverage of every important aspect of this story."
      ),
    ],
  };
}

export const seedLanguages: LanguageCode[] = ["hi", "en"];
