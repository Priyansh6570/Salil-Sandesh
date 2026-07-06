"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { Article, Paginated } from "@salil-sandesh/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with ${response.status}`);
  }
  return payload;
}

export function ArticlesTable({
  canCreate,
  canPublish,
  canDelete,
}: {
  canCreate: boolean;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");
  const queryClient = useQueryClient();
  const articles = useQuery<Paginated<Article>>({
    queryKey: ["articles", page],
    queryFn: () => fetch(`/api/bff/articles?page=${page}&limit=20`).then(jsonOrThrow<Paginated<Article>>),
  });

  const statusAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "publish" | "unpublish" }) => {
      await jsonOrThrow(await fetch(`/api/bff/articles/${id}/${action}`, { method: "POST" }));
    },
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const deleteAction = useMutation({
    mutationFn: async (id: string) => {
      await jsonOrThrow(await fetch(`/api/bff/articles/${id}`, { method: "DELETE" }));
    },
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const items = articles.data?.items ?? [];
  const total = articles.data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / 20), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">लेख</h1>
        {canCreate ? (
          <Link href="/articles/new" className={buttonVariants({})}>
            नया लेख
          </Link>
        ) : null}
      </div>
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      {articles.isLoading ? <p className="text-muted-foreground">लोड हो रहा है…</p> : null}
      {!articles.isLoading && items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          कोई लेख नहीं
        </p>
      ) : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-3 font-medium">शीर्षक</th>
                <th className="p-3 font-medium">स्थिति</th>
                <th className="p-3 font-medium">भाषाएँ</th>
                <th className="p-3 font-medium">अद्यतन</th>
                <th className="p-3 font-medium">क्रियाएँ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((article) => {
                const title =
                  article.translations[article.defaultLanguage]?.title ?? "(शीर्षक नहीं)";
                const languages = Object.keys(article.translations).join(", ");
                return (
                  <tr key={article.id} className="border-b last:border-0">
                    <td className="p-3">
                      <Link href={`/articles/${article.id}`} className="font-medium hover:underline">
                        {title}
                      </Link>
                    </td>
                    <td className="p-3">
                      <Badge variant={article.status === "published" ? "default" : "secondary"}>
                        {article.status === "published" ? "प्रकाशित" : "मसौदा"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{languages}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(article.updatedAt).toLocaleDateString("hi-IN")}
                    </td>
                    <td className="flex gap-2 p-3">
                      {canPublish ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={statusAction.isPending}
                          onClick={() =>
                            statusAction.mutate({
                              id: article.id,
                              action: article.status === "published" ? "unpublish" : "publish",
                            })
                          }
                        >
                          {article.status === "published" ? "अप्रकाशित करें" : "प्रकाशित करें"}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteAction.isPending}
                          onClick={() => {
                            if (window.confirm("क्या आप वाकई हटाना चाहते हैं?")) {
                              deleteAction.mutate(article.id);
                            }
                          }}
                        >
                          हटाएँ
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {totalPages > 1 ? (
        <div className="flex items-center gap-4">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            पिछला
          </Button>
          <span className="text-sm text-muted-foreground">
            पृष्ठ {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            अगला
          </Button>
        </div>
      ) : null}
    </div>
  );
}
