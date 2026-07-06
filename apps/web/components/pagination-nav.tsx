import Link from "next/link";
import type { Paginated } from "@salil-sandesh/shared";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UiDictionary } from "@/lib/i18n";

export function PaginationNav({
  result,
  basePath,
  query,
  dict,
}: {
  result: Paginated<unknown>;
  basePath: string;
  query: Record<string, string | undefined>;
  dict: UiDictionary;
}) {
  const totalPages = Math.max(Math.ceil(result.total / result.limit), 1);
  if (totalPages <= 1) {
    return null;
  }
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params.set(key, value);
      }
    }
    params.set("page", page.toString());
    return `${basePath}?${params.toString()}`;
  };
  return (
    <nav className="mt-8 flex items-center justify-center gap-4">
      {result.page > 1 ? (
        <Link href={pageHref(result.page - 1)} className={buttonVariants({ variant: "outline" })}>
          {dict.previous}
        </Link>
      ) : null}
      <span className="text-sm text-muted-foreground">
        {dict.pageLabel} {result.page} / {totalPages}
      </span>
      {result.page < totalPages ? (
        <Link href={pageHref(result.page + 1)} className={cn(buttonVariants({ variant: "outline" }))}>
          {dict.next}
        </Link>
      ) : null}
    </nav>
  );
}
