import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/api";
import { getDictionary, parseLang } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { ArticleBody } from "@/components/article-body";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ArticlePageProps {
  params: { slug: string };
  searchParams: { lang?: string | string[] };
}

export async function generateMetadata({
  params,
  searchParams,
}: ArticlePageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug, parseLang(searchParams.lang));
  if (!article) {
    return {};
  }
  return { title: article.title, description: article.excerpt };
}

export default async function ArticlePage({ params, searchParams }: ArticlePageProps) {
  const lang = parseLang(searchParams.lang);
  const article = await getArticleBySlug(params.slug, lang);
  if (!article) {
    notFound();
  }
  const dict = getDictionary(article.language);
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {article.isBreaking ? <Badge variant="destructive">{dict.breaking}</Badge> : null}
        {article.isPremium ? <Badge variant="secondary">{dict.premium}</Badge> : null}
        <Link href={`/section/${article.category.slug}`}>
          <Badge variant="outline">{article.category.name}</Badge>
        </Link>
      </div>
      <h1 className="text-4xl font-bold leading-tight tracking-tight">{article.title}</h1>
      <p className="text-lg text-muted-foreground">{article.excerpt}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Link href={`/author/${article.author.slug}`} className="font-medium hover:underline">
          {article.author.name}
        </Link>
        <time dateTime={article.publishedAt}>
          {formatDate(article.publishedAt, article.language)}
        </time>
      </div>
      <LanguageSwitcher
        slug={article.slug}
        availableLanguages={article.availableLanguages}
        current={article.language}
        dict={dict}
      />
      {article.cover ? (
        <div className="relative aspect-video overflow-hidden rounded-xl">
          <Image
            src={article.cover.url}
            alt={article.cover.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      ) : null}
      <Separator />
      <ArticleBody body={article.body} unsupportedLabel={dict.unsupportedContent} />
      {article.tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          {article.tags.map((tag) => (
            <Link key={tag.id} href={`/tag/${tag.slug}`}>
              <Badge variant="secondary">{tag.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
