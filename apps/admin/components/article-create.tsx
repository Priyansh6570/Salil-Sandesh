"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Article } from "@salil-sandesh/shared";
import { ArticleForm, type ArticleFormPayload } from "@/components/article-form";

export function ArticleCreate() {
  const router = useRouter();
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: async (payload: ArticleFormPayload) => {
      const response = await fetch("/api/bff/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as Article & { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "सहेजने में विफल");
      }
      return result;
    },
    onSuccess: (article) => {
      router.push(`/articles/${article.id}`);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">नया लेख</h1>
      <ArticleForm onSubmit={(payload) => create.mutate(payload)} submitting={create.isPending} error={error} />
    </div>
  );
}
