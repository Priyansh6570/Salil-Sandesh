import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getSiteConfig } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { SearchForm } from "@/components/search-form";
import { Separator } from "@/components/ui/separator";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  return {
    title: { default: site.name, template: `%s | ${site.name}` },
    description: site.tagline,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, categories] = await Promise.all([getSiteConfig(), getCategories()]);
  const dict = getDictionary(site.defaultLanguage);
  return (
    <html lang={site.defaultLanguage}>
      <body className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="container flex flex-col gap-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link href="/" className="text-3xl font-bold tracking-tight">
                {site.name}
              </Link>
              <SearchForm dict={dict} />
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
              <Link href="/" className="hover:underline">
                {dict.home}
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/section/${category.slug}`}
                  className="hover:underline"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container flex-1 py-8">{children}</main>
        <footer className="border-t">
          <div className="container flex flex-col gap-4 py-8 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="hover:underline">
                {dict.about}
              </Link>
              <Link href="/contact" className="hover:underline">
                {dict.contact}
              </Link>
              <Link href="/privacy" className="hover:underline">
                {dict.privacy}
              </Link>
              <Link href="/terms" className="hover:underline">
                {dict.terms}
              </Link>
            </div>
            <Separator />
            <p>
              {site.name} — {site.tagline}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
