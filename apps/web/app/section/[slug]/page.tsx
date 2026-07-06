import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlesByCategory, getCategories } from "@/lib/api";
import { getDictionary, parseLang, parsePage } from "@/lib/i18n";
import { ArticleGrid } from "@/components/article-grid";
import { PaginationNav } from "@/components/pagination-nav";

interface SectionPageProps {
  params: { slug: string };
  searchParams: { lang?: string | string[]; page?: string | string[] };
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const categories = await getCategories();
  const category = categories.find((entry) => entry.slug === params.slug);
  return category ? { title: category.name } : {};
}

export default async function SectionPage({ params, searchParams }: SectionPageProps) {
  const lang = parseLang(searchParams.lang);
  const page = parsePage(searchParams.page);
  const dict = getDictionary(lang);
  const categories = await getCategories();
  const category = categories.find((entry) => entry.slug === params.slug);
  if (!category) {
    notFound();
  }
  const result = await getArticlesByCategory(category.slug, { page, limit: 12, lang });
  if (!result) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
      <ArticleGrid articles={result.items} dict={dict} lang={lang} />
      <PaginationNav
        result={result}
        basePath={`/section/${category.slug}`}
        query={{ lang }}
        dict={dict}
      />
    </div>
  );
}
