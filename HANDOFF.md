# HANDOFF — Phase 7: Media library (R2)

## What I built

- **Upload pipeline** (`apps/api/src/services/media.service.ts`): mime allowlist (jpeg/png/webp/gif/avif), 8 MB size cap, `sharp` reads real dimensions (fails closed if unreadable), auto-rotates by EXIF, downscales to ≤2400px longest edge, and **re-encodes every upload to WebP** (quality 82). Stored in R2 under `media/<year>/<uuid>.webp` with a 1-year immutable cache header; a Media doc records key + dimensions + alt. `multer` memory storage enforces the size/count/mime limits before the handler; multer errors map to 400 (size) in the error handler.
- **URL discipline**: `MediaSummary.url` is always rebuilt from `key` + `MEDIA_PUBLIC_BASE_URL` (`mediaUrlFromKey`); the stored doc has no URL field, so a stored URL can never be trusted. No raw-URL image entry exists anywhere — every image is chosen by `mediaId` through the picker.
- **`image` node added to editor-config end to end**: `allowedNodes` gains `image` (attrs `mediaId/alt/width/height`), the validator requires a 24-hex `mediaId` and rejects content on the node, `collectImageMediaIds` walks a body for referenced ids, and the web renderer gained a matching `image` case (parity guard still holds). Stored image nodes carry only `mediaId/alt/width/height` — never `src`.
- **src resolution at the edges**: the public detail endpoint replaces each inline image node's `mediaId` with a resolved `{src,width,height,alt}` (controlled origin), dropping `mediaId` from the public payload; the admin edit endpoint enriches image nodes with `src` while keeping `mediaId` so the editor can display them. `stripInlineImageSrc` removes `src` again — applied to **every translation body in the form's onSubmit** (not just the active editor tab), so re-saving an image-bearing article never leaks a `src` into the validated payload.
- **Delete guard**: articles carry a derived `referencedMediaIds` array (cover + all inline image ids), recomputed on every create/update and indexed. `deleteMedia` refuses (409) if the id is any article's cover, any article's inline image, or any user's avatar; only unreferenced media are removed from R2 and Mongo.
- **Admin UI**: a `MediaPicker` dialog (upload + paginated browse + pick) used for both the article cover and inline editor images; a standalone `/media` library page (upload, browse, delete with the guard surfaced as a 409 message), both gated (`media:upload` to view/upload, `media:manage` to delete). BFF media routes stream the multipart upload to the API with a fresh access token and enforce the size cap before forwarding; `next/image` allowlist added to the admin app.

## Decisions & deviations

- Cover selection reuses the same `MediaPicker` as inline images — one component, two mount points.
- Inline images render with `next/image` (explicit width/height from the media doc) inside the typed walker; the src is the controlled origin, so the existing `remotePatterns` allowlist covers them with no wildcard.
- `referencedMediaIds` is a denormalized index rather than scanning Mixed bodies at delete time — makes the guard a single indexed query and keeps deletes O(1).
- `sharp` is marked `external` in the API's tsup build (native binary, not bundled).

## Verification (real output)

`pnpm -w typecheck`: `5 successful` · `pnpm -w build`: `3 successful`.

Real upload → R2 → controlled-origin WebP, mime rejection, delete-then-gone (authenticated, against live R2 + Atlas):

```
upload -> 201 {"id":"6a4bc449a1d516b9f6375ff3","url":"https://pub-…r2.dev/media/2026/87bbc163-….webp","alt":"verification image","width":900,"height":600,"kind":"image",...}
served url -> 200 content-type: image/webp host: pub-aa65b5478f16452289b7209ad7e2c7f6.r2.dev
text/plain upload -> 400 {"error":"no file uploaded"}
delete unreferenced -> 200 {"ok":true}
served url after delete -> 404
```

Cover + inline image on one article, then the delete guard:

```
article with cover+inline -> 201 id: 6a4bc44fa1d516b9f6376005
delete referenced media -> 409 {"error":"media is referenced by an article cover, inline image, or author avatar"}
```

Inline-image src resolution (edit view keeps mediaId + adds src; public view resolves to the controlled origin and drops mediaId):

```
edit-view image node has src (enriched): true keeps mediaId: true
public image node resolved src: https://pub-…r2.dev/media/2026/6bb98492-….webp
public image has no mediaId leak: true
public image dims: 900x600
cleanup: article deleted, media delete after article removal -> 200
```

Edit-then-save of an image-bearing article (the flow the build reviewer flagged as untested), showing the form-level strip works and the validator still guards:

```
create with inline image -> 201
edit view image has src: true mediaId: true
re-save enriched-then-stripped body -> 200
re-save WITHOUT stripping (should 400) -> 400 {"error":"doc.content[1]: attr 'src' is not allowed"}
cleanup done
```

Types-live proof (set `MediaSummary.width` to `String(doc.width)` in the serializer, then reverted):

```
src/services/media.service.ts(30,5): error TS2322: Type 'string' is not assignable to type 'number'.
```

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only. R2 secret access key is read from env only; the `*.r2.dev` public host in output is the reader-facing serving origin (no credential).

## Watch-outs

- The public serving origin is `MEDIA_PUBLIC_BASE_URL` (a `*.r2.dev` dev domain); a custom media domain should replace it before production (already flagged in Phase 3).
- Deleting an article does not delete its media (media are reusable); orphan media accumulate — a future sweep/GC could reclaim media with zero references, out of scope now.
- The delete guard depends on `referencedMediaIds` being recomputed on write; all write paths (create/update) do so, and older seed articles (created before this field) default to `[]` — re-saving them repopulates it. The Phase 9 seed writes the field directly.

## Reviews

- build-reviewer: issues-fixed — deliverables, wiring, parity, and HANDOFF authenticity all verified against uncached runs. One BLOCKING defect fixed: re-saving an article with inline images 400'd because `stripInlineImageSrc` only ran on the editor's `onUpdate`, never for the initial enriched body or non-active language tabs. It now runs over every translation body in the form's `onSubmit`; re-verified live (enriched-then-stripped re-save → 200, unstripped → 400). Minor defect fixed: removed the unused `getMediaSummaries` export (annotate-as-you-consume).
- security-reviewer: PASS — secrets, layered upload validation (multer + sharp content-sniff + BFF size check), URL-from-key discipline, exact-host image allowlists, mediaId-only persistence, DB-resolved RBAC, delete guard, and no-SSRF all clean. Two low advisories applied: `sharp` now sets `limitInputPixels: 30_000_000` (decompression-bomb bound), and the editor's image node discards any pasted `src` at parse time (`parseHTML: () => null`) as belt-and-suspenders over the server validator.

## Next step

Phase 8 — users & roles: staff CRUD (create with phone+roles → immediate OTP login), role assignment, soft deactivate, roles CRUD over the permission catalogue, self-lockout guards (last admin, self-deprivilege), server-enforced.
