# HANDOFF — Phase 4: Public website (`apps/web`)

## What I built

- **Shell** (`app/layout.tsx`): masthead with the brand from `GET /site` (nothing hardcoded), category nav from `GET /categories`, search form, footer with static-page links. App renders dynamically (`force-dynamic`) with per-fetch `revalidate` caching, so builds never require a running API.
- **Typed API client** (`lib/api.ts`): every call returns shared types (`SiteConfig`, `Category`, `Tag`, `Paginated<ArticleCard>`, `ArticleDetail`, `AuthorPublic`); 404s map to `null` → `notFound()`.
- **Home** (`app/page.tsx`): featured (`?featured=true`), latest, and per-category sections, all honouring `?lang=`.
- **Article page** (`app/article/[slug]`): typed TipTap renderer + **language switcher** listing `availableLanguages` (current highlighted, links via `?lang=`), cover via `next/image`, byline/date (locale-aware `Intl` formatting), tag links, metadata from the translation.
- **Typed renderer** (`components/article-body.tsx`): recursive walker over `TipTapNode`. Node and mark renderers are `Record<AllowedNode, …>` / `Record<AllowedMark, …>` built from `@salil-sandesh/editor-config`, so **renderer↔editor-config parity is enforced at typecheck** (removing a renderer is a compile error — proven below). Unknown node/mark → visible "असमर्थित सामग्री" chip, never a silent drop. No `dangerouslySetInnerHTML` anywhere. Link marks render only after protocol sanitization (http/https, else plain text).
- **Section / author / tag / search pages** with pagination (prev/next preserving `lang`/`q`), graceful empty states; search is server-rendered from `?q=` (uncached), form GET keeps URLs shareable.
- **Static pages**: about, contact, privacy, terms (Hindi), plus a Hindi `not-found` page.
- **Images**: `next/image` `remotePatterns` built in `next.config.mjs` from `MEDIA_PUBLIC_BASE_URL` (loaded from the root `.env`) — protocol + exact hostname + path prefix, **no wildcard host**; empty allowlist if the var is absent (fail closed).
- **i18n** (`lib/i18n.ts`): UI dictionary with `hi` default and `en`, `getDictionary` falls back to Hindi for any other code; `languageNames` in native script for the switcher; `parseLang` validates `?lang=` against shared `languageCodes`.
- shadcn/ui primitives (button, card, badge, input, separator) hand-written to the new-york style under `components/ui/` (CLI generation avoided to keep the no-comments rule); all styling through the shadcn token layer.

## Decisions & deviations

- **TanStack Query deferred**: with search server-rendered there is zero client-side data fetching in the public site, so adding the QueryClient would be dead weight (and cross-origin fetches to the API would additionally need CORS). It enters with the admin app where real client mutations exist. Deviation from the stack line in CLAUDE.md §3, declared here deliberately.
- `force-dynamic` on the root layout: a news site's pages should not be frozen at build time; per-fetch `revalidate` (60s articles, 300s config/taxonomy) provides the caching layer instead.
- `API_URL` (server-side, non-secret) defaults to `http://localhost:4000`; set it in the deploy environment.

## Verification (real output)

`pnpm -w typecheck`: `5 successful` · `pnpm -w build`: `3 successful` (web build no longer touches the API).

Real pages served by `next start` against the live API + Atlas seed:

```
home -> 200 (30284 bytes)
article-hi -> 200 (20258 bytes)
article-en -> 200 (20079 bytes)
section -> 200 (13388 bytes)
author -> 200 (18787 bytes)
tag -> 200 (15325 bytes)
search -> 200 (17529 bytes)
about -> 200 (11097 bytes)
unknown-article -> 404
```

Content assertions on the served HTML:

```
hi page has Hindi title: True
hi page has switcher link to en: True
hi page renders heading node: True
hi page renders blockquote: True
hi page renders list item: True
en page has English title: True
en page has English body: True
en page switcher marks hi available: True
hi page uses next/image for cover: True
home has featured section: True
home has latest section: True
home has breaking badge: True
home shows cricket article: True
home nav has categories: True
search shows result: True
empty search graceful: True
tag page shows tagged article: True
```

Renderer↔editor-config parity proof (removed the `hardBreak` renderer, then reverted):

```
components/article-body.tsx(84,7): error TS2741: Property 'hardBreak' is missing in type '{ doc: ...; }' but required in type 'Record<"blockquote" | "text" | "doc" | "paragraph" | "heading" | "bulletList" | "orderedList" | "listItem" | "horizontalRule" | "hardBreak", ...>'.
```

Safety greps: `dangerouslySetInnerHTML|localStorage|sessionStorage` across `apps/web` → no matches. `git ls-files` filtered for `.env` → `.env.example` only.

## Watch-outs

- The seed's cover key has no real object in R2 yet, so the cover image request 404s at the media origin (the page and `next/image` markup are correct; Phase 7/9 put real objects behind the keys).
- Home fetches per-category sections for the first 4 categories (2 exist today); with many categories revisit the fan-out.
- UI dictionary covers `hi`/`en`; other languages fall back to Hindi UI copy while article content still renders in the requested language.

## Reviews

- build-reviewer: PASS — deliverables wired end to end (client paths cross-checked against actual API routes), renderer parity proof reproduced independently in a scratch compile, no comments, no dead TanStack dependency behind the declared deferral, content assertions consistent with dictionary and seed sources.
- security-reviewer: issues-fixed — XSS surfaces clean (React text nodes only, `safeHref` rejects `javascript:`/`data:`, heading tag clamped to h1–h6), image allowlist exact-host and fail-closed, no token storage, all user input into the API client encoded/validated. Two low/info items applied: baseline security headers (nosniff, referrer-policy, frame deny, permissions-policy) added to `next.config.mjs`, and `parsePage` hoisted into `lib/i18n.ts` to remove four duplicated copies. Deferred with note: full CSP at the deployment phase.

## Next step

Phase 5 — admin CMS foundation (`apps/admin`): BFF session (httpOnly AES-GCM cookie, server-side refresh rotation via route handlers), phone-OTP login, permission-gated shell/nav, finalize `packages/editor-config`.
