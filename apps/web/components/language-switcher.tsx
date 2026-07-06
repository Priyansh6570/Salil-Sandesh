import Link from "next/link";
import type { LanguageCode } from "@salil-sandesh/shared";
import { Badge } from "@/components/ui/badge";
import { languageNames, type UiDictionary } from "@/lib/i18n";

export function LanguageSwitcher({
  slug,
  availableLanguages,
  current,
  dict,
}: {
  slug: string;
  availableLanguages: LanguageCode[];
  current: LanguageCode;
  dict: UiDictionary;
}) {
  if (availableLanguages.length <= 1) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{dict.availableIn}</span>
      {availableLanguages.map((code) => (
        <Link key={code} href={`/article/${slug}?lang=${code}`}>
          <Badge variant={code === current ? "default" : "outline"}>{languageNames[code]}</Badge>
        </Link>
      ))}
    </div>
  );
}
