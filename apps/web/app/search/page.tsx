import type { Metadata } from "next";
import { searchArticles } from "@/lib/api";
import { getDictionary, parseLang, parsePage } from "@/lib/i18n";
import { ArticleGrid } from "@/components/article-grid";
import { PaginationNav } from "@/components/pagination-nav";
import { SearchForm } from "@/components/search-form";

interface SearchPageProps {
  searchParams: { q?: string | string[]; lang?: string | string[]; page?: string | string[] };
}

export const metadata: Metadata = { title: "खोज" };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const lang = parseLang(searchParams.lang);
  const page = parsePage(searchParams.page);
  const dict = getDictionary(lang);
  const q = typeof searchParams.q === "string" ? searchParams.q.slice(0, 100).trim() : "";
  const result = q ? await searchArticles(q, { page, limit: 12, lang }) : null;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{dict.search}</h1>
      <SearchForm dict={dict} defaultValue={q} />
      {result ? (
        <>
          <p className="text-muted-foreground">
            {dict.searchResultsFor} “{q}” ({result.total})
          </p>
          <ArticleGrid articles={result.items} dict={dict} lang={lang} />
          <PaginationNav result={result} basePath="/search" query={{ q, lang }} dict={dict} />
        </>
      ) : null}
    </div>
  );
}
