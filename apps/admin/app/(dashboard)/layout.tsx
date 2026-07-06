import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { visibleNavItems } from "@/lib/nav";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const items = visibleNavItems(me.permissions);
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r bg-muted/30 p-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          सलिल संदेश
        </Link>
        <p className="text-xs text-muted-foreground">प्रबंधन प्रणाली</p>
        <Separator className="my-4" />
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator className="my-4" />
        <div className="space-y-2">
          <p className="text-sm font-medium">{me.name}</p>
          <div className="flex flex-wrap gap-1">
            {me.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
