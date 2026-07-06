import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { UsersManager } from "@/components/users-manager";

export default async function UsersPage() {
  const me = await requireUser("/users");
  if (!me.permissions.includes("user:manage")) {
    redirect("/");
  }
  return <UsersManager />;
}
