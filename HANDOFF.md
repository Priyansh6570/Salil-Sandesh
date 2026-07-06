# HANDOFF — Phase 9: Seed + finalize

## What I built

- **Idempotent seed** (`apps/api/src/scripts/seed/`, run with `pnpm --filter @salil-sandesh/api seed`):
  - **Roles**: `admin` (all permissions, system-locked), `editor`, `author`, `writer`, `photographer` — upserted by name.
  - **Staff**: 6 users upserted **by phone** (the unique login key, so the seed consolidates any pre-existing accounts): an OTP-loginable admin at **`+919999000001`** plus editor/author/writer/photographer staff, all active.
  - **Categories**: 8 Hindi sections (प्रमुख, राष्ट्रीय, विश्व, व्यापार, खेल, मनोरंजन, तकनीक, स्वास्थ्य), each with a generated **R2-hosted cover** placeholder (category-coloured WebP with the section name, uploaded under a deterministic `seed/covers/<slug>.webp` key and upserted as a Media doc — idempotent, and served through the `next/image` allowlist).
  - **Articles**: ~40 **real Hindi headlines** pulled live from NewsData.io (`country=in&language=hi`), mapped to sections by the provider's category, each given a **coherent generated Hindi TipTap body** (lead paragraph from the real description, a "मुख्य बिंदु" heading, a bulleted list, a blockquote — all within editor-config), a round-robin author, two tags, the section cover, and flags (first two breaking, first six featured). Every seventh article also gets a **manual English translation** to exercise the language switcher. Slugs are latin, transliterated from the title with a stable article-id suffix, so re-seeding the same headline upserts rather than duplicates.
- **Media reference integrity**: seeded articles set `referencedMediaIds` (cover + any inline images) directly, so the Phase 7 delete guard protects seed covers immediately.

## Decisions & deviations

- NewsData.io free tier returns null `image_url` and paywalled `content`, so covers are generated R2 placeholders (external hosts are blocked by the `next/image` allowlist anyway) and bodies are generated-but-coherent from the real title + description — exactly what the kickoff specifies ("generate Hindi TipTap bodies (dummy but coherent)").
- The feed is "latest", so re-running the seed hours later fetches newer headlines and adds them (each upserts by its own slug); it does not reset to a fixed 40. Idempotent per article, not "always exactly 40".
- English translation titles/excerpts are generic English renderings (the provider gives only Hindi text); enough to make the switcher meaningful without machine-translating arbitrary Hindi. AI translation remains deferred by design.
- Verification across earlier phases left a few extra published articles (3) and test staff (4) in Atlas; they are valid, inert content. The 6 named staff and 8 sections are the authoritative set.

## Verification (real output)

`pnpm -w typecheck`: `5 successful` · `pnpm -w build`: `3 successful`.

Seed against Atlas + R2 (first run, then immediately re-run — idempotent):

```
seed connected to salil_sandesh
roles ready: admin, editor, author, writer, photographer
users ready: 6 (4 can author)
categories ready with covers: 8
fetched 40 real Hindi headlines from NewsData.io
{"articlesCreated":40,"articlesUpdated":0,"articlesWithEnglish":6,"categories":8,"tags":8,"staff":6,"otpLoginAdminPhone":"+919999000001"}

(second run)
{"articlesCreated":0,"articlesUpdated":40,"articlesWithEnglish":6,"categories":8,"tags":8,"staff":6,"otpLoginAdminPhone":"+919999000001"}
```

Public site fully browsable (production `next start` against the live API + seeded Atlas):

```
home -> 200 (121741 bytes)
nav 'प्रमुख': True   nav 'राष्ट्रीय': True   nav 'विश्व': True   nav 'व्यापार': True   nav 'खेल': True
featured heading: True
latest heading: True
R2 cover via next/image: True
breaking badge: True
total published articles: 43
article with EN translation: dll-...-eb623a langs=hi+en
detail page -> 200 (renders 'मुख्य बिंदु' heading node: True, switcher to en: True, cover: True)
en view has 'Key points': True
section/khel -> 200
search 'भारत' -> 200
author/sandeep-sharma -> 200 (shows संदीप शर्मा: True)
unknown article -> 404
```

Admin login + management over the BFF (seeded admin `+919999000001`, code from server log):

```
admin BFF login (seeded admin +919999000001): true
dashboard -> 200 shows admin name: true
admin article list total: 44
admin user list count: 10
staff roles: photographer,writer,author,editor,admin
media library items: 9
```

End-to-end flow author→translate→publish→read is proven across Phase 6 (authoring/translation/publish) and this phase (seeded content live on the public site with the language switcher).

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only.

## Watch-outs

- Re-seeding pulls fresh "latest" headlines; to reset to a known set, clear the `articles` collection first. Category covers, roles, staff, and tags are stable across re-runs.
- The `*.r2.dev` public media host should be swapped for a custom domain before production (flagged since Phase 3); the seed keys are stable so covers survive the swap.
- NewsData.io free-tier quota is limited; the seed tolerates partial fetches (uses whatever it receives up to 40).

## Reviews

- build-reviewer: pending (final whole-app pass)
- security-reviewer: pending (final whole-app pass)

## Next step

Project complete. Optional follow-ups (all deferred by design): AI-assisted translation as a reviewable admin draft, per-IP rate limiting on public search, a custom media domain, and a background family-revoke on user deactivation for instant session kill.
