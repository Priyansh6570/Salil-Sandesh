import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { ArticleCreate } from "@/components/article-create";

export default async function NewArticlePage() {
  const me = await requireUser("/articles/new");
  if (!me.permissions.includes("article:create")) {
    redirect("/articles");
  }
  return <ArticleCreate />;
}
