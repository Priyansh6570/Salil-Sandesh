"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRef, useState } from "react";
import type { MediaSummary, Paginated } from "@salil-sandesh/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `request failed with ${response.status}`);
  }
  return payload;
}

export function MediaPicker({
  onSelect,
  onClose,
}: {
  onSelect: (media: MediaSummary) => void;
  onClose: () => void;
}) {
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
    onSuccess: (uploaded) => {
      setError("");
      setAlt("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onSelect(uploaded);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const items = media.data?.items ?? [];
  const totalPages = Math.max(Math.ceil((media.data?.total ?? 0) / 24), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">मीडिया चुनें</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            बंद करें
          </Button>
        </div>
        <div className="space-y-2 border-b p-4">
          <Label htmlFor="media-file">नई छवि अपलोड करें</Label>
          <div className="flex flex-wrap items-end gap-2">
            <input
              ref={fileRef}
              id="media-file"
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
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground">कोई मीडिया नहीं</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group overflow-hidden rounded-md border text-left"
                  onClick={() => onSelect(item)}
                >
                  <span className="relative block aspect-video bg-muted">
                    <Image
                      src={item.url}
                      alt={item.alt}
                      fill
                      sizes="200px"
                      className="object-cover transition-opacity group-hover:opacity-80"
                    />
                  </span>
                  <span className="block truncate p-1 text-xs text-muted-foreground">
                    {item.width}×{item.height}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-4 border-t p-3">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              पिछला
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
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
    </div>
  );
}
