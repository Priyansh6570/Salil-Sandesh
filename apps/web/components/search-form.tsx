import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UiDictionary } from "@/lib/i18n";

export function SearchForm({ dict, defaultValue }: { dict: UiDictionary; defaultValue?: string }) {
  return (
    <form action="/search" className="flex w-full max-w-sm items-center gap-2">
      <Input
        type="search"
        name="q"
        placeholder={dict.searchPlaceholder}
        defaultValue={defaultValue}
        maxLength={100}
        required
      />
      <Button type="submit" variant="secondary" size="icon" aria-label={dict.search}>
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
