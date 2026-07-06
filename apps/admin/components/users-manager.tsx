"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { RoleSummary, UserSummary } from "@salil-sandesh/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with ${response.status}`);
  }
  return payload;
}

interface DraftState {
  name: string;
  phone: string;
  roleIds: string[];
}

const emptyDraft: DraftState = { name: "", phone: "", roleIds: [] };

export function UsersManager() {
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const users = useQuery<UserSummary[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/bff/users").then(jsonOrThrow<UserSummary[]>),
  });
  const roles = useQuery<RoleSummary[]>({
    queryKey: ["roles"],
    queryFn: () => fetch("/api/bff/roles").then(jsonOrThrow<RoleSummary[]>),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const create = useMutation({
    mutationFn: async () =>
      jsonOrThrow<UserSummary>(
        await fetch("/api/bff/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        })
      ),
    onSuccess: () => {
      setError("");
      setDraft(emptyDraft);
      invalidate();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "blocked" }) =>
      jsonOrThrow<UserSummary>(
        await fetch(`/api/bff/users/${id}/status`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        })
      ),
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const roleOptions = roles.data ?? [];
  const toggleDraftRole = (id: string): void => {
    setDraft((current) => ({
      ...current,
      roleIds: current.roleIds.includes(id)
        ? current.roleIds.filter((entry) => entry !== id)
        : [...current.roleIds, id],
    }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">उपयोगकर्ता</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>नया कर्मचारी जोड़ें</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">नाम</Label>
                <Input
                  id="user-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-phone">फ़ोन (+91…)</Label>
                <Input
                  id="user-phone"
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                  placeholder="+919000000000"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>भूमिकाएँ</Label>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                  <button key={role.id} type="button" onClick={() => toggleDraftRole(role.id)}>
                    <Badge variant={draft.roleIds.includes(role.id) ? "default" : "outline"}>
                      {role.name}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={create.isPending || draft.roleIds.length === 0}>
              कर्मचारी बनाएँ
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium">नाम</th>
              <th className="p-3 font-medium">फ़ोन</th>
              <th className="p-3 font-medium">भूमिकाएँ</th>
              <th className="p-3 font-medium">स्थिति</th>
              <th className="p-3 font-medium">क्रियाएँ</th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{user.name}</td>
                <td className="p-3 text-muted-foreground">{user.phone}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role.id} variant="secondary">
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={user.status === "active" ? "default" : "destructive"}>
                    {user.status === "active" ? "सक्रिय" : "निष्क्रिय"}
                  </Badge>
                </td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setStatus.isPending}
                    onClick={() =>
                      setStatus.mutate({
                        id: user.id,
                        status: user.status === "active" ? "blocked" : "active",
                      })
                    }
                  >
                    {user.status === "active" ? "निष्क्रिय करें" : "सक्रिय करें"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
