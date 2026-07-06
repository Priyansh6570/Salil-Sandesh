import Image from "next/image";
import Link from "next/link";
import type { ArticleCard, LanguageCode } from "@salil-sandesh/shared";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { UiDictionary } from "@/lib/i18n";

export function ArticleCardItem({
  article,
  dict,
  lang,
}: {
  article: ArticleCard;
  dict: UiDictionary;
  lang?: LanguageCode;
}) {
  const href = `/article/${article.slug}${lang ? `?lang=${lang}` : ""}`;
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {article.cover ? (
        <Link href={href} className="relative block aspect-video">
          <Image
            src={article.cover.url}
            alt={article.cover.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </Link>
      ) : null}
      <CardHeader className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {article.isBreaking ? <Badge variant="destructive">{dict.breaking}</Badge> : null}
          {article.isPremium ? <Badge variant="secondary">{dict.premium}</Badge> : null}
          <Link href={`/section/${article.category.slug}`}>
            <Badge variant="outline">{article.category.name}</Badge>
          </Link>
        </div>
        <CardTitle className="text-lg">
          <Link href={href} className="hover:underline">
            {article.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-between text-xs text-muted-foreground">
        <Link href={`/author/${article.author.slug}`} className="hover:underline">
          {article.author.name}
        </Link>
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, lang)}</time>
      </CardFooter>
    </Card>
  );
}
