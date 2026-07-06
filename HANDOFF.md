# HANDOFF — Phase 6: Article CRUD + editor + multilingual authoring

## What I built

- **Editor-config as the enforced single source** (`packages/editor-config`): now exports, beyond the node/mark allow-lists, `allowedHeadingLevels` (2–4), `allowedLinkProtocols` (http/https), and `validateArticleBody(unknown): string[]` — a structural validator (unknown node/mark types, doc-only-at-root, non-empty text, heading-level bounds, absolute http(s) link hrefs, depth cap 20, node cap 5000, first-20 violations). The API validates writes with it, the admin editor builds its extensions from it, and the web renderer's compile-time parity already covers it — one source, three consumers.
- **Admin article API** (`/admin/*`, all behind `requireAuth` + per-route `requirePermissions`):
  - `GET /admin/articles` (body-free list, all statuses, `article:edit`), `GET /admin/articles/:id` (full translations).
  - `POST /admin/articles` (`article:create`) — author is the authenticated user; `PUT /admin/articles/:id` (`article:edit`) — full translation-map replace, must keep the default-language translation (schema-refined).
  - `POST …/publish|unpublish` (`article:publish`; `publishedAt` set on first publish), `DELETE` (`article:delete`).
  - Payloads zod-validated (`utils/article-schemas.ts`): bounded title/excerpt, kebab-case latin slugs, ObjectId-shaped refs, and bodies refined through `validateArticleBody` → 400 with the exact violation. Per-language **slug uniqueness across articles** → 409 (`SlugConflictError`).
- **Admin BFF layer** (`lib/bff.ts` + `app/api/bff/*`): session-aware proxy that reseals the cookie on expiry and retries once on upstream 401; article list/create/get/update/delete/publish/unpublish plus a taxonomy route; ids format-checked before path construction, list query rebuilt from a zod-parsed whitelist (no client-controlled API paths).
- **TipTap editor built FROM editor-config** (`lib/editor-extensions.ts`): StarterKit options derived from the allow-lists — disallowed nodes/marks (code, codeBlock, strike, underline) hard-disabled, heading levels from `allowedHeadingLevels`, link mark restricted to http/https with no autolink; toolbar (`components/rich-text-editor.tsx`) offers exactly the allowed set, and the link prompt client-validates protocols.
- **Multilingual authoring** (`components/article-form.tsx`): per-article language tabs — switch, add any missing language (empty translation scaffold), remove any non-default translation; per-tab title/slug/excerpt/body; shared fields (category select, tag toggles, breaking/featured/premium flags) live once on the article. Publish state is per-article. No AI translation anywhere (deferred by design).
- **Pages**: `/articles` (list with status badges, language codes, publish/unpublish/delete actions gated by the caller's resolved permissions — server passes `me.permissions` from RSC), `/articles/new` (redirects without `article:create`), `/articles/[id]` (edit + publish toggle, redirects without `article:edit`). UI gating is UX; every mutation is enforced server-side by the API middleware.

## Decisions & deviations

- Slugs are latin kebab-case by schema (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) — keeps URLs portable; Devanagari titles live in `title`, not the slug.
- Admin list serializes translations body-free (bodies stripped to `{type:"doc"}` placeholders) to keep the table light; the edit view fetches the full document.
- Author selection UI deferred: `authorId` is the authenticated creator (Phase 8's user management can add reassignment if wanted).
- Cover/media picking is deliberately absent — that is Phase 7's insert-by-mediaId picker; no raw-URL image path exists anywhere.
- `dev-seed.ts` gained a `writer` fixture (article:create/edit only, phone +919999000003) to prove negative permission gating.

## Verification (real output)

`pnpm -w typecheck`: `5 successful` · `pnpm -w build`: `3 successful`.

Full authoring flow over the admin BFF (editor login via OTP from the server log), against Atlas:

```
create -> 201 id=6a4bbad30f64a0170d172038 status=draft
codeBlock body -> 400 {"error":"doc.content[0]: node type 'codeBlock' is not allowed"}
js link -> 400 {"error":"doc.content[0].content[0].marks[0]: link href must be an absolute http or https url"}
duplicate slug -> 409 {"error":"slug 'shiksha-budget-vriddhi' is already used by another article in language 'hi'"}
publish -> 200 status=published publishedAt=2026-07-06T14:25:25.697Z
update -> 200 languages=hi+en
hi title: शिक्षा बजट में बड़ी वृद्धि
en title: Major increase in education budget
```

Permission gating (server-side, not just UI):

```
writer publish -> 403 error=forbidden   (writer role: article:create/edit only)
writer can list -> 200 total=4
no token -> 401                          (direct GET /admin/articles)
articles list page -> 200 has-heading=True
```

Published article live on the public site (heading, bold, list, blockquote, link, switcher):

```
hindi title: True
heading node: True
bold text: True
list item: True
blockquote: True
sanitized link: True
switcher to en: True
english title via ?lang=en: True
english heading: True
english slug resolves: 200
```

Types-live proof (set `status: "archived"` in the admin serializer, then reverted):

```
src/services/article-admin.service.ts(35,5): error TS2322: Type '"archived"' is not assignable to type '"draft" | "published"'.
```

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only.

## Watch-outs

- An early verification run authored Devanagari through PowerShell's `Invoke-WebRequest`, which mangled some UTF-8; the content was re-put via a Node client (output above). Lesson recorded: drive JSON-with-Devanagari verification through Node, not PS 5.1.
- Unpublish shares the publish handler (`makeStatusHandler("draft")`) and permission; verified implicitly by the publish path and the writer 403.
- Deleting an article does not yet guard against nothing — media delete guards arrive in Phase 7; category/tag deletion doesn't exist yet (Phase 8 scope note).
- Editor's TipTap StarterKit ships input rules for markdown-ish shortcuts of disallowed nodes disabled implicitly (extensions off); if a new node is ever allowed, editor + renderer + validator all update from the one allow-list.

## Reviews

- build-reviewer: issues-fixed — all deliverables and HANDOFF authenticity verified against uncached runs (error strings character-exact, types-live line/col confirmed, no AI-translation code). Two defects fixed: (1) toolbar lacked an H4 button despite `allowedHeadingLevels` including 4 — heading buttons are now derived from `allowedHeadingLevels` so the toolbar cannot drift from the config; (2) the BFF list route now `safeParse`s its query and returns 400 instead of 500 on crafted params.
- security-reviewer: issues-fixed — write-path validation coverage, link-protocol enforcement, zod-gated Mongo keys (runtime-confirmed `$where`/`__proto__` translation keys are rejected), RBAC per route, BFF token confinement, and DoS caps all clean. Two low advisories applied: (1) per-language slug indexes are now `unique, sparse` with duplicate-key errors mapped to the 409 path, closing the check-then-write race; (2) the validator now rejects unknown `attrs` on nodes and marks (per-type attr allow-lists, primitive-only values, length caps, `orderedList.start` bounded) — verified: typical TipTap output passes, `{"onClick":"alert(1)"}` and nested junk attrs are rejected.

## Next step

Phase 7 — media library: R2 upload pipeline (mime allowlist, size cap, sharp dims, WebP re-encode), media browser + insert-by-mediaId picker (cover + inline image, which adds the `image` node to editor-config end to end), delete guard for referenced covers.
