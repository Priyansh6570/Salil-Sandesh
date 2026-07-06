import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")] });

export interface NewsArticle {
  articleId: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  sourceName: string;
}

interface NewsDataResult {
  article_id?: string;
  title?: string;
  description?: string;
  category?: string[];
  keywords?: string[] | null;
  source_name?: string;
}

interface NewsDataResponse {
  status: string;
  results?: NewsDataResult[];
  nextPage?: string | null;
}

function normalize(result: NewsDataResult): NewsArticle | null {
  if (!result.article_id || !result.title || !result.description) {
    return null;
  }
  return {
    articleId: result.article_id,
    title: result.title.trim(),
    description: result.description.trim(),
    category: result.category?.[0] ?? "top",
    keywords: (result.keywords ?? []).slice(0, 4),
    sourceName: result.source_name ?? "समाचार स्रोत",
  };
}

export async function fetchHindiHeadlines(target: number): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("NEWS_API_KEY is required for the seed");
  }
  const collected = new Map<string, NewsArticle>();
  let nextPage: string | null = null;
  for (let request = 0; request < 8 && collected.size < target; request += 1) {
    const url = new URL("https://newsdata.io/api/1/latest");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("country", "in");
    url.searchParams.set("language", "hi");
    if (nextPage) {
      url.searchParams.set("page", nextPage);
    }
    const response = await fetch(url);
    if (!response.ok) {
      break;
    }
    const data = (await response.json()) as NewsDataResponse;
    if (data.status !== "success" || !data.results) {
      break;
    }
    for (const result of data.results) {
      const article = normalize(result);
      if (article && !collected.has(article.title)) {
        collected.set(article.title, article);
      }
    }
    if (!data.nextPage) {
      break;
    }
    nextPage = data.nextPage;
  }
  return [...collected.values()].slice(0, target);
}
