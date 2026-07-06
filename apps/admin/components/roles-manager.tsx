"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  Permission,
  PermissionCatalogueEntry,
  RoleSummary,
} from "@salil-sandesh/shared";
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

function groupPermissions(
  entries: PermissionCatalogueEntry[]
): Array<{ group: string; permissions: Permission[] }> {
  const map = new Map<string, Permission[]>();
  for (const entry of entries) {
    const list = map.get(entry.group) ?? [];
    list.push(entry.key);
    map.set(entry.group, list);
  }
  return [...map.entries()].map(([group, permissions]) => ({ group, permissions }));
}

export function RolesManager() {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Permission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const catalogue = useQuery<PermissionCatalogueEntry[]>({
    queryKey: ["permissions"],
    queryFn: () => fetch("/api/bff/permissions").then(jsonOrThrow<PermissionCatalogueEntry[]>),
  });
  const roles = useQuery<RoleSummary[]>({
    queryKey: ["roles"],
    queryFn: () => fetch("/api/bff/roles").then(jsonOrThrow<RoleSummary[]>),
  });

  const reset = (): void => {
    setName("");
    setSelected([]);
    setEditingId(null);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["roles"] });
    reset();
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = JSON.stringify({ name, permissions: selected });
      const url = editingId ? `/api/bff/roles/${editingId}` : "/api/bff/roles";
      const method = editingId ? "PUT" : "POST";
      return jsonOrThrow<RoleSummary>(
        await fetch(url, { method, headers: { "content-type": "application/json" }, body })
      );
    },
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await jsonOrThrow(await fetch(`/api/bff/roles/${id}`, { method: "DELETE" }));
    },
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const togglePermission = (permission: Permission): void => {
    setSelected((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission]
    );
  };

  const startEdit = (role: RoleSummary): void => {
    setEditingId(role.id);
    setName(role.name);
    setSelected(role.permissions);
    setError("");
  };

  const groups = groupPermissions(catalogue.data ?? []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">भूमिकाएँ</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "भूमिका संपादित करें" : "नई भूमिका"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="role-name">नाम</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Label>अनुमतियाँ</Label>
              {groups.map((group) => (
                <div key={group.group} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.permissions.map((permission) => (
                      <button
                        key={permission}
                        type="button"
                        onClick={() => togglePermission(permission)}
                      >
                        <Badge variant={selected.includes(permission) ? "default" : "outline"}>
                          {permission}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending}>
                {editingId ? "सहेजें" : "भूमिका बनाएँ"}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  रद्द करें
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {(roles.data ?? []).map((role) => (
          <div
            key={role.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-medium">{role.name}</p>
                {role.systemLocked ? <Badge variant="secondary">सिस्टम</Badge> : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {role.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
            {!role.systemLocked ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(role)}>
                  संपादित करें
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("इस भूमिका को हटाएँ?")) {
                      remove.mutate(role.id);
                    }
                  }}
                >
                  हटाएँ
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
