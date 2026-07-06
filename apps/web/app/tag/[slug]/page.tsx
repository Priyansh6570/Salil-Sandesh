import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByTag, getTags } from "@/lib/api";
import { getDictionary, parseLang, parsePage } from "@/lib/i18n";
import { ArticleGrid } from "@/components/article-grid";
import { PaginationNav } from "@/components/pagination-nav";

interface TagPageProps {
  params: { slug: string };
  searchParams: { lang?: string | string[]; page?: string | string[] };
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tags = await getTags();
  const tag = tags.find((entry) => entry.slug === params.slug);
  return tag ? { title: tag.name } : {};
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const lang = parseLang(searchParams.lang);
  const page = parsePage(searchParams.page);
  const dict = getDictionary(lang);
  const tags = await getTags();
  const tag = tags.find((entry) => entry.slug === params.slug);
  if (!tag) {
    notFound();
  }
  const result = await getArticlesByTag(tag.slug, { page, limit: 12, lang });
  if (!result) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        {dict.tags}: {tag.name}
      </h1>
      <ArticleGrid articles={result.items} dict={dict} lang={lang} />
      <PaginationNav result={result} basePath={`/tag/${tag.slug}`} query={{ lang }} dict={dict} />
    </div>
  );
}
