import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { MediaLibrary } from "@/components/media-library";

export default async function MediaPage() {
  const me = await requireUser("/media");
  if (!me.permissions.includes("media:upload")) {
    redirect("/");
  }
  return <MediaLibrary canManage={me.permissions.includes("media:manage")} />;
}
