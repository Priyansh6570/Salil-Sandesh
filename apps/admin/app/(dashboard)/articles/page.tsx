import { requireUser } from "@/lib/require-user";
import { ArticlesTable } from "@/components/articles-table";

export default async function ArticlesPage() {
  const me = await requireUser("/articles");
  const granted = new Set(me.permissions);
  return (
    <ArticlesTable
      canCreate={granted.has("article:create")}
      canPublish={granted.has("article:publish")}
      canDelete={granted.has("article:delete")}
    />
  );
}
