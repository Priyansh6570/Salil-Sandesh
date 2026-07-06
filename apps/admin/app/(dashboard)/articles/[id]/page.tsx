import { notFound, redirect } from "next/navigation";
import { isObjectId } from "@/lib/article-id";
import { requireUser } from "@/lib/require-user";
import { ArticleEdit } from "@/components/article-edit";

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  if (!isObjectId(params.id)) {
    notFound();
  }
  const me = await requireUser(`/articles/${params.id}`);
  if (!me.permissions.includes("article:edit")) {
    redirect("/articles");
  }
  return <ArticleEdit id={params.id} canPublish={me.permissions.includes("article:publish")} />;
}
