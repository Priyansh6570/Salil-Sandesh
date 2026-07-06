"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Article } from "@salil-sandesh/shared";
import { ArticleForm, type ArticleFormPayload } from "@/components/article-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with ${response.status}`);
  }
  return payload;
}

export function ArticleEdit({ id, canPublish }: { id: string; canPublish: boolean }) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const article = useQuery<Article>({
    queryKey: ["article", id],
    queryFn: () => fetch(`/api/bff/articles/${id}`).then(jsonOrThrow<Article>),
  });

  const update = useMutation({
    mutationFn: async (payload: ArticleFormPayload) =>
      jsonOrThrow<Article>(
        await fetch(`/api/bff/articles/${id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
      ),
    onSuccess: () => {
      setError("");
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["article", id] });
    },
    onError: (mutationError: Error) => {
      setSaved(false);
      setError(mutationError.message);
    },
  });

  const statusAction = useMutation({
    mutationFn: async (action: "publish" | "unpublish") =>
      jsonOrThrow<Article>(await fetch(`/api/bff/articles/${id}/${action}`, { method: "POST" })),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["article", id] });
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  if (article.isLoading) {
    return <p className="text-muted-foreground">लोड हो रहा है…</p>;
  }
  if (!article.data) {
    return <p className="text-destructive">लेख नहीं मिला।</p>;
  }
  const current = article.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">लेख संपादन</h1>
          <Badge variant={current.status === "published" ? "default" : "secondary"}>
            {current.status === "published" ? "प्रकाशित" : "मसौदा"}
          </Badge>
        </div>
        {canPublish ? (
          <Button
            variant="outline"
            disabled={statusAction.isPending}
            onClick={() =>
              statusAction.mutate(current.status === "published" ? "unpublish" : "publish")
            }
          >
            {current.status === "published" ? "अप्रकाशित करें" : "प्रकाशित करें"}
          </Button>
        ) : null}
      </div>
      {saved ? <p className="text-sm text-muted-foreground">सहेजा गया।</p> : null}
      <ArticleForm
        key={current.updatedAt}
        initial={current}
        onSubmit={(payload) => update.mutate(payload)}
        submitting={update.isPending}
        error={error}
      />
    </div>
  );
}
