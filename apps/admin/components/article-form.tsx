"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Image from "next/image";
import type {
  Article,
  ArticleTranslation,
  Category,
  LanguageCode,
  MediaSummary,
  Tag,
  TipTapNode,
} from "@salil-sandesh/shared";
import { defaultLanguageCode, languageCodes } from "@salil-sandesh/shared";
import { MediaPicker } from "@/components/media-picker";
import { RichTextEditor } from "@/components/rich-text-editor";
import { stripInlineImageSrc } from "@/lib/strip-image-src";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const languageNames: Record<LanguageCode, string> = {
  hi: "हिन्दी",
  en: "English",
  bn: "বাংলা",
  gu: "ગુજરાતી",
  mr: "मराठी",
  pa: "ਪੰਜਾਬੀ",
  ta: "தமிழ்",
  te: "తెలుగు",
  ur: "اردو",
};

function emptyTranslation(): ArticleTranslation {
  return {
    title: "",
    excerpt: "",
    slug: "",
    body: { type: "doc", content: [{ type: "paragraph" }] },
  };
}

export interface ArticleFormPayload {
  defaultLanguage: LanguageCode;
  translations: Partial<Record<LanguageCode, ArticleTranslation>>;
  categoryId: string;
  tagIds: string[];
  coverMediaId?: string;
  isBreaking: boolean;
  isFeatured: boolean;
  isPremium: boolean;
}

interface Taxonomy {
  categories: Category[];
  tags: Tag[];
}

export function ArticleForm({
  initial,
  onSubmit,
  submitting,
  error,
}: {
  initial?: Article;
  onSubmit: (payload: ArticleFormPayload) => void;
  submitting: boolean;
  error: string;
}) {
  const [translations, setTranslations] = useState<
    Partial<Record<LanguageCode, ArticleTranslation>>
  >(initial?.translations ?? { [defaultLanguageCode]: emptyTranslation() });
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>(
    initial?.defaultLanguage ?? defaultLanguageCode
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [isBreaking, setIsBreaking] = useState(initial?.isBreaking ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isPremium, setIsPremium] = useState(initial?.isPremium ?? false);
  const [cover, setCover] = useState<MediaSummary | null>(null);
  const [coverMediaId, setCoverMediaId] = useState(initial?.coverMediaId ?? "");
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const defaultLanguage = initial?.defaultLanguage ?? defaultLanguageCode;

  const taxonomy = useQuery<Taxonomy>({
    queryKey: ["taxonomy"],
    queryFn: async () => {
      const response = await fetch("/api/bff/taxonomy");
      if (!response.ok) {
        throw new Error("taxonomy load failed");
      }
      return response.json();
    },
  });

  const active = translations[activeLanguage] ?? emptyTranslation();
  const usedLanguages = Object.keys(translations) as LanguageCode[];
  const remainingLanguages = languageCodes.filter((code) => !usedLanguages.includes(code));

  const updateActive = (patch: Partial<ArticleTranslation>): void => {
    setTranslations((current) => ({
      ...current,
      [activeLanguage]: { ...(current[activeLanguage] ?? emptyTranslation()), ...patch },
    }));
  };

  const addLanguage = (code: LanguageCode): void => {
    setTranslations((current) => ({ ...current, [code]: emptyTranslation() }));
    setActiveLanguage(code);
  };

  const removeLanguage = (code: LanguageCode): void => {
    if (code === defaultLanguage) {
      return;
    }
    setTranslations((current) => {
      const next = { ...current };
      delete next[code];
      return next;
    });
    setActiveLanguage(defaultLanguage);
  };

  const toggleTag = (id: string): void => {
    setTagIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const cleanedTranslations: Partial<Record<LanguageCode, ArticleTranslation>> = {};
        for (const [language, translation] of Object.entries(translations)) {
          cleanedTranslations[language as LanguageCode] = {
            ...translation,
            body: stripInlineImageSrc(translation.body as TipTapNode),
          };
        }
        onSubmit({
          defaultLanguage,
          translations: cleanedTranslations,
          categoryId,
          tagIds,
          coverMediaId: coverMediaId || undefined,
          isBreaking,
          isFeatured,
          isPremium,
        });
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>अनुवाद</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {usedLanguages.map((code) => (
              <Button
                key={code}
                type="button"
                variant={code === activeLanguage ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveLanguage(code)}
              >
                {languageNames[code]}
                {code === defaultLanguage ? " (मूल)" : ""}
              </Button>
            ))}
            {remainingLanguages.length > 0 ? (
              <select
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                value=""
                onChange={(event) => {
                  if (event.target.value) {
                    addLanguage(event.target.value as LanguageCode);
                  }
                }}
              >
                <option value="">+ भाषा जोड़ें</option>
                {remainingLanguages.map((code) => (
                  <option key={code} value={code}>
                    {languageNames[code]}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">शीर्षक</Label>
                <Input
                  id="title"
                  value={active.title}
                  onChange={(event) => updateActive({ title: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">स्लग (latin, kebab-case)</Label>
                <Input
                  id="slug"
                  value={active.slug}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  onChange={(event) => updateActive({ slug: event.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">सारांश</Label>
              <Input
                id="excerpt"
                value={active.excerpt}
                onChange={(event) => updateActive({ excerpt: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>मुख्य सामग्री</Label>
              <RichTextEditor
                key={activeLanguage}
                value={active.body as TipTapNode}
                onChange={(body) => updateActive({ body })}
              />
            </div>
            {activeLanguage !== defaultLanguage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeLanguage(activeLanguage)}
              >
                {languageNames[activeLanguage]} अनुवाद हटाएँ
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>वर्गीकरण और फ़्लैग</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">श्रेणी</Label>
            <select
              id="category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">श्रेणी चुनें</option>
              {(taxonomy.data?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>कवर छवि</Label>
            <div className="flex items-center gap-3">
              {cover ? (
                <span className="relative block h-16 w-28 overflow-hidden rounded border">
                  <Image src={cover.url} alt={cover.alt} fill sizes="112px" className="object-cover" />
                </span>
              ) : coverMediaId ? (
                <span className="text-sm text-muted-foreground">चयनित (id: {coverMediaId.slice(-6)})</span>
              ) : (
                <span className="text-sm text-muted-foreground">कोई कवर नहीं</span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setCoverPickerOpen(true)}>
                {coverMediaId ? "बदलें" : "चुनें"}
              </Button>
              {coverMediaId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCover(null);
                    setCoverMediaId("");
                  }}
                >
                  हटाएँ
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>टैग</Label>
            <div className="flex flex-wrap gap-2">
              {(taxonomy.data?.tags ?? []).map((tag) => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}>
                  <Badge variant={tagIds.includes(tag.id) ? "default" : "outline"}>
                    {tag.name}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isBreaking}
                onChange={(event) => setIsBreaking(event.target.checked)}
              />
              ब्रेकिंग
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(event) => setIsFeatured(event.target.checked)}
              />
              प्रमुख
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(event) => setIsPremium(event.target.checked)}
              />
              प्रीमियम
            </label>
          </div>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={submitting}>
        सहेजें
      </Button>
      {coverPickerOpen ? (
        <MediaPicker
          onSelect={(media) => {
            setCover(media);
            setCoverMediaId(media.id);
            setCoverPickerOpen(false);
          }}
          onClose={() => setCoverPickerOpen(false)}
        />
      ) : null}
    </form>
  );
}
