import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { RolesManager } from "@/components/roles-manager";

export default async function RolesPage() {
  const me = await requireUser("/roles");
  if (!me.permissions.includes("role:manage")) {
    redirect("/");
  }
  return <RolesManager />;
}
