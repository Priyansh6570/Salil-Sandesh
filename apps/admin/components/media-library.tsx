"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRef, useState } from "react";
import type { MediaSummary, Paginated } from "@salil-sandesh/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with ${response.status}`);
  }
  return payload;
}

export function MediaLibrary({ canManage }: { canManage: boolean }) {
  const [page, setPage] = useState(1);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const media = useQuery<Paginated<MediaSummary>>({
    queryKey: ["media", page],
    queryFn: () => fetch(`/api/bff/media?page=${page}&limit=24`).then(jsonOrThrow<Paginated<MediaSummary>>),
  });

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        throw new Error("कृपया एक फ़ाइल चुनें");
      }
      const form = new FormData();
      form.set("file", file);
      form.set("alt", alt);
      return jsonOrThrow<MediaSummary>(await fetch("/api/bff/media", { method: "POST", body: form }));
    },
    onSuccess: () => {
      setError("");
      setAlt("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await jsonOrThrow(await fetch(`/api/bff/media/${id}`, { method: "DELETE" }));
    },
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const items = media.data?.items ?? [];
  const totalPages = Math.max(Math.ceil((media.data?.total ?? 0) / 24), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">मीडिया</h1>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="text-sm"
        />
        <Input
          placeholder="वैकल्पिक टेक्स्ट (alt)"
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          className="max-w-xs"
        />
        <Button type="button" onClick={() => upload.mutate()} disabled={upload.isPending}>
          अपलोड
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          कोई मीडिया नहीं
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border">
              <span className="relative block aspect-video bg-muted">
                <Image src={item.url} alt={item.alt} fill sizes="240px" className="object-cover" />
              </span>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs text-muted-foreground">
                  {item.width}×{item.height}
                </p>
                {canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm("इस छवि को हटाएँ?")) {
                        remove.mutate(item.id);
                      }
                    }}
                  >
                    हटाएँ
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
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
