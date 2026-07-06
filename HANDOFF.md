# HANDOFF — Phase 3: Public read API

## What I built

- **Site config**: `GET /site` serves the static brand config (`config/site.ts`, typed as shared `SiteConfig`) — no per-tenant anything.
- **Taxonomy**: `GET /categories` (ordered) and `GET /tags`, serialized to the shared `Category`/`Tag` wire types.
- **Articles** (all public routes serve only `status: "published"`):
  - `GET /articles` — paginated body-free cards, `?lang=` selects the translation with centralised fallback to `defaultLanguage`, optional `?featured=true` / `?breaking=true` filters (consumed by the Phase 4 home page).
  - `GET /articles/search?q=` — Mongo text index across every language's `title`/`excerpt`, body-free cards.
  - `GET /articles/by-category/:slug`, `/by-tag/:slug`, `/by-author/:slug` — slug resolved to the ref first (404 on unknown), then the same paginated card pipeline.
  - `GET /articles/:slug?lang=` — detail with TipTap body + tags; the slug matches ANY language's slug (an English slug finds the article and still serves the requested/default language).
  - `GET /authors/:slug` — public author profile (`AuthorPublic`: name, slug, bio, avatar). Never exposes phone, roles, or status.
- **Language fallback centralised** in `utils/language.ts` (`resolveTranslation`): requested language if present, else `defaultLanguage`; also reports `availableLanguages` on every card/detail for the Phase 4 language switcher.
- **Batch resolution, no N+1** (`services/article-read.service.ts`): one `$in` query each for categories, authors, and cover media per page of cards; author avatars and covers rebuilt from `key` + `MEDIA_PUBLIC_BASE_URL` (`utils/media-url.ts`), never a stored URL.
- **Indexes** on the article schema: `{status, publishedAt}` (+ category/author/tag variants), sparse per-language slug indexes, and one combined text index over all languages' title/excerpt.
- **Query hygiene**: every query/param parsed with zod (`utils/query-schemas.ts`) — `lang` enum-bound, `page`/`limit` bounded (max 50), `q` length-capped, object-shaped query injection rejected with 400 before any Mongo query.
- `scripts/dev-seed.ts`: idempotent dev fixtures (2 categories, 2 tags, 1 author with editor role, 1 cover media doc, 2 published Hindi articles — one featured with a full English translation, one breaking Hindi-only — and 1 draft that must never appear publicly). Phase 9 replaces this with the real NewsData-driven seed.
- Shared types added: `SiteConfig`, `CategoryRef`, `TagRef`, `AuthorRef`, `AuthorPublic`, `MediaRef`, `ArticleCard`, `ArticleDetail`, `Paginated<T>`.

## Decisions & deviations

- `MEDIA_PUBLIC_BASE_URL` is now a required env var (URL-validated) since cover URLs are built from it; the API fails at boot without it.
- Detail lookup matches the slug across all languages via `$or` over the per-language sparse indexes; per-language slug uniqueness is still a Phase 6 write-path concern.
- `?featured=`/`?breaking=` filters added to the list endpoint because Phase 4's home page consumes them — noted to keep the scope ledger honest.
- Seed media keys (e.g. `seed/cover-monsoon.webp`) don't exist in R2 yet; URLs are structurally correct and Phase 7/9 put real objects behind them.

## Verification (real output)

`pnpm -w typecheck`: `5 successful, 5 total` · `pnpm -w build`: `3 successful, 3 total, Time: 15.291s`.

Seed (`tsx src/scripts/dev-seed.ts`):

```
dev-seed connected to salil_sandesh
{"author":"sandeep-sharma","categories":["rashtriya","khel"],"tags":["chunav","cricket"],"cover":"seed/cover-monsoon.webp","published":[{"id":"6a4b9f4005f4694c0bacec82","languages":["hi","en"]},{"id":"6a4b9f4005f4694c0bacec83","languages":["hi"]}],"draft":{"id":"6a4b9f4005f4694c0bacec84","status":"draft"}}
```

Live reads against Atlas:

```
SITE: {"name":"सलिल संदेश","nameLatin":"Salil Sandesh","tagline":"आपका विश्वसनीय समाचार स्रोत","defaultLanguage":"hi","languages":["hi","en","bn","gu","mr","pa","ta","te","ur"]}
CATEGORIES: rashtriya,khel
TAGS: cricket,chunav
LIST: total=2 items=2
  card: [hi] भारत ने रोमांचक मुकाबले में सीरीज़ जीती | slug=bharat-series-jeet | author=संदीप शर्मा | cat=khel | cover=none | body-free=True
  card: [hi] मानसून सत्र में जल नीति पर बड़ा फैसला | slug=monsoon-satra-jal-niti | author=संदीप शर्मा | cat=rashtriya | cover=https://pub-aa65b5478f16452289b7209ad7e2c7f6.r2.dev/seed/cover-monsoon.webp | body-free=True
```

Language selection and fallback (`?lang=en`):

```
lang=en card: [hi] भारत ने रोमांचक मुकाबले में सीरीज़ जीती | available=hi
lang=en card: [en] Major water policy decision expected in monsoon session | available=hi+en
```

Detail, cross-language slugs, drafts, 404s:

```
detail hi-slug: [hi] मानसून सत्र में जल नीति पर बड़ा फैसला | body.type=doc nodes=5 | tags=chunav
detail ?lang=en: [en] Major water policy decision expected in monsoon session
detail by EN slug: [hi] मानसून सत्र में जल नीति पर बड़ा फैसला
untranslated ?lang=en falls back: [hi] भारत ने रोमांचक मुकाबले में सीरीज़ जीती
draft slug -> 404
unknown slug -> 404
```

Filtered lists, search (Hindi and English), author profile, input guards:

```
by-category khel: total=1 first=भारत ने रोमांचक मुकाबले में सीरीज़ जीती
by-tag chunav: total=1 first=मानसून सत्र में जल नीति पर बड़ा फैसला
by-author: total=2
featured filter: total=1 first=monsoon-satra-jal-niti
search 'जल': total=1 first=monsoon-satra-jal-niti
search 'water' lang=en: total=1 first=[en] Major water policy decision expected in monsoon session
author profile: {"id":"6a4b9f4005f4694c0bacec7c","name":"संदीप शर्मा","slug":"sandeep-sharma","bio":"वरिष्ठ संवाददाता, दो दशक का पत्रकारिता अनुभव"}
author has phone field: False
unknown category -> 404
bad page param -> 400
```

Types-live proof (set `isBreaking: "yes"` in the card assembler, then reverted):

```
src/services/article-read.service.ts(84,5): error TS2322: Type 'string' is not assignable to type 'boolean'.
```

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only.

## Watch-outs

- Search uses Mongo's text index (language-agnostic tokenizer); Hindi stemming is basic. Good enough for now; revisit if search quality matters later.
- The cover URL host (`pub-…r2.dev`) is the controlled origin from env — Phase 4's `next/image` `remotePatterns` must allowlist exactly this host and nothing else.
- Author pages expose any active staff user by exact slug (name/slug/bio/avatar only). If authors-without-articles should 404, tighten in Phase 4/8.

## Reviews

- build-reviewer: PASS — deliverables, wiring, route ordering, no-N+1 batch resolution, index set, zod bindings, seed idempotency, and HANDOFF authenticity (sort orders, node counts, and types-live line/col cross-checked against source) all verified; no defects. Noted (non-blocking): search accepts-but-ignores `featured`/`breaking`; card assembly falls back to empty refs if a lookup misses.
- security-reviewer: issues-fixed — secrets, draft isolation on every route, field-explicit serialization (no phone/roles/status leaks), zod-gated query injection, media-URL-from-key-only all clean. One-line low fix applied: the `status: "published"` gate now spreads AFTER caller filters so it can never be overridden. Deferred with scope notes: per-IP rate limit on public search (pre-launch), authors-without-articles exposure (Phase 8), custom media domain to replace `*.r2.dev` (pre-launch).

## Next step

Phase 4 — public website (`apps/web`): shell, home (featured/latest/by-section), article page with typed TipTap renderer + language switcher, section/author/tag/search pages, static pages, `next/image` allowlist, hi-default i18n dictionary.
