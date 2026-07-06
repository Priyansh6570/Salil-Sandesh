import type { ArticleCard, LanguageCode } from "@salil-sandesh/shared";
import { ArticleCardItem } from "@/components/article-card-item";
import type { UiDictionary } from "@/lib/i18n";

export function ArticleGrid({
  articles,
  dict,
  lang,
}: {
  articles: ArticleCard[];
  dict: UiDictionary;
  lang?: LanguageCode;
}) {
  if (articles.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {dict.noArticles}
      </p>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCardItem key={article.id} article={article} dict={dict} lang={lang} />
      ))}
    </div>
  );
}
