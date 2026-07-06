import Link from "next/link";
import { getArticles, getArticlesByCategory, getCategories } from "@/lib/api";
import { getDictionary, parseLang } from "@/lib/i18n";
import { ArticleGrid } from "@/components/article-grid";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { lang?: string | string[] };
}) {
  const lang = parseLang(searchParams.lang);
  const dict = getDictionary(lang);
  const [featured, latest, categories] = await Promise.all([
    getArticles({ featured: true, limit: 3, lang }),
    getArticles({ limit: 9, lang }),
    getCategories(),
  ]);
  const sections = await Promise.all(
    categories.slice(0, 4).map(async (category) => ({
      category,
      articles: await getArticlesByCategory(category.slug, { limit: 3, lang }),
    }))
  );
  return (
    <div className="space-y-12">
      {featured.items.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{dict.featured}</h2>
          <ArticleGrid articles={featured.items} dict={dict} lang={lang} />
        </section>
      ) : null}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">{dict.latest}</h2>
        <ArticleGrid articles={latest.items} dict={dict} lang={lang} />
      </section>
      {sections.map(({ category, articles }) =>
        articles && articles.items.length > 0 ? (
          <section key={category.id} className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              <Link href={`/section/${category.slug}`} className="hover:underline">
                {category.name}
              </Link>
            </h2>
            <ArticleGrid articles={articles.items} dict={dict} lang={lang} />
          </section>
        ) : null
      )}
    </div>
  );
}
