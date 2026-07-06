import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getArticlesByAuthor, getAuthorBySlug } from "@/lib/api";
import { getDictionary, parseLang, parsePage } from "@/lib/i18n";
import { ArticleGrid } from "@/components/article-grid";
import { PaginationNav } from "@/components/pagination-nav";
import { Separator } from "@/components/ui/separator";

interface AuthorPageProps {
  params: { slug: string };
  searchParams: { lang?: string | string[]; page?: string | string[] };
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  return author ? { title: author.name, description: author.bio } : {};
}

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const lang = parseLang(searchParams.lang);
  const page = parsePage(searchParams.page);
  const dict = getDictionary(lang);
  const author = await getAuthorBySlug(params.slug);
  if (!author) {
    notFound();
  }
  const result = await getArticlesByAuthor(author.slug, { page, limit: 12, lang });
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {author.avatar ? (
          <Image
            src={author.avatar.url}
            alt={author.avatar.alt}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : null}
        <div>
          <p className="text-sm text-muted-foreground">{dict.authorLabel}</p>
          <h1 className="text-3xl font-bold tracking-tight">{author.name}</h1>
          {author.bio ? <p className="mt-1 text-muted-foreground">{author.bio}</p> : null}
        </div>
      </div>
      <Separator />
      {result ? (
        <>
          <ArticleGrid articles={result.items} dict={dict} lang={lang} />
          <PaginationNav
            result={result}
            basePath={`/author/${author.slug}`}
            query={{ lang }}
            dict={dict}
          />
        </>
      ) : (
        <p className="text-muted-foreground">{dict.noArticles}</p>
      )}
    </div>
  );
}
