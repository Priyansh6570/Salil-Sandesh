import { requireUser } from "@/lib/require-user";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const me = await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">डैशबोर्ड</h1>
        <p className="text-muted-foreground">नमस्ते, {me.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>आपकी अनुमतियाँ</CardTitle>
          <CardDescription>डेटाबेस से प्रति-अनुरोध सत्यापित</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {me.permissions.map((permission) => (
            <Badge key={permission} variant="outline">
              {permission}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
