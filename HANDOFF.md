# HANDOFF — Phase 1: Data models + shared types

## What I built

- `packages/shared` now carries the full type contract: runtime catalogues (`languageCodes` with `hi` default, `userStatuses`, `articleStatuses`, `mediaKinds`, `refreshTokenStatuses`, `permissionCatalogue` of 10 permissions) plus wire types `User`, `Role`, `Article`/`ArticleTranslation`/`ArticleFlags`, `Category`, `Tag`, `Media`, `RefreshTokenRecord`, and generic `TipTapNode`/`TipTapMark`.
- `apps/api/src/models/`: seven Mongoose schemas (`user`, `role`, `article`, `category`, `tag`, `media`, `refresh-token`) with a barrel `index.ts`. Schema enums are built FROM the shared runtime catalogues, so enum drift between API and frontends is a compile error.
- Article schema: `translations` as a `Map` of per-language subdocuments `{ title, excerpt, slug, body (Mixed TipTap JSON) }`; map keys validated against `languageCodes`; a pre-validate hook rejects any article lacking a translation for its `defaultLanguage`; shared fields (category, author, tags, cover, flags, status, publishedAt) live on the article.
- Uniqueness via indexes: `user.phone`, `user.slug`, `role.name`, `category.slug`, `tag.slug`, `media.key`, `refreshToken.tokenHash`; lookup indexes on `refreshToken.userId` and `familyId`.
- Verification script `apps/api/src/scripts/model-roundtrip.ts`: creates one of each document against Atlas, reads the article back, asserts four validation rejections, cleans up after itself. Hardened per security review: a negative check that unexpectedly succeeds now deletes the stray document and exits non-zero, and cleanup runs in a `finally` so midway crashes don't leak test documents.

## Decisions & deviations

- Language codes are a curated const list (`hi en bn gu mr pa ta te ur`) rather than free strings — adding a language is a one-line shared change; keeps editor tabs, fallback logic, and map-key validation typed.
- `RefreshToken` got `tokenHash` and `expiresAt` beyond the spec's minimum ("user, family id, rotated/active state") because rotation in Phase 2 is impossible without them; nothing else was added ahead of need.
- Doc→wire field parity (ObjectId→string, Date→ISO) locks in when Phase 3 serializers return shared types from documents; today the shared runtime catalogues are the enforced drift guard (proven below).

## Verification (real output)

`pnpm -w typecheck`: `Tasks: 5 successful, 5 total` · `pnpm -w build`: `Tasks: 3 successful, 3 total, Time: 15.147s`.

Round-trip against Atlas (`tsx src/scripts/model-roundtrip.ts`, re-run after hardening):

```
roundtrip connected to salil_sandesh
{
  "articleId": "6a4b9a791ed61e0ccafdcbc8",
  "defaultLanguage": "hi",
  "translationLanguages": [
    "hi",
    "en"
  ],
  "hindiTitle": "जल संरक्षण पर विशेष रिपोर्ट",
  "englishTitle": "Special report on water conservation",
  "bodyNodeType": "doc",
  "status": "draft",
  "isBreaking": true,
  "categoryId": "6a4b9a791ed61e0ccafdcbc2",
  "authorId": "6a4b9a791ed61e0ccafdcbbd",
  "tagIds": [
    "6a4b9a791ed61e0ccafdcbc4"
  ],
  "coverMediaId": "6a4b9a791ed61e0ccafdcbc6",
  "refreshTokenStatus": "active"
}
article with unsupported language key: rejected -> Article validation failed: translations: translations must be non-empty and keyed by supported language codes
article missing default-language translation: rejected -> missing translation for default language hi
role with unknown permission: rejected -> Role validation failed: permissions.0: `article:fly` is not a valid enum value for path `permissions.0`.
user with invalid status: rejected -> User validation failed: status: `asleep` is not a valid enum value for path `status`.
roundtrip cleanup complete (7 documents removed)
```

Types-live proof (changed the user schema default to `"activee" satisfies UserStatus`, then reverted):

```
src/models/user.model.ts(13,26): error TS1360: Type '"activee"' does not satisfy the expected type '"active" | "blocked"'.
```

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only.

## Watch-outs

- `translations` map slugs are not globally unique at the schema level (dynamic keys can't carry a Mongo unique index); per-language slug uniqueness gets enforced in the article service when writes are built (Phase 6), and slug lookup indexes (`translations.hi.slug` etc.) get added in Phase 3 with the read paths.
- `body` is `Schema.Types.Mixed` — deep-change tracking requires `markModified("translations")` on nested body edits; editor-config validation of body content arrives with the write path (Phase 6).
- Blank `.env` values still pending for Phase 2: `JWT_ACCESS_SECRET`, `ADMIN_SESSION_SECRET`, `SECRETS_ENC_KEY`.
- Phase 2 note from security review: any TTL index on refresh tokens must key off `expiresAt` only — `rotated`/`revoked` records must survive long enough for family reuse detection.

## Reviews

- build-reviewer: issues-fixed — all deliverables, drift guard, index set, and verification authenticity confirmed (roundtrip ObjectIds and validator strings cross-checked against sources; types-live line/col reproduced empirically). Two minor defects fixed: `media.alt` had contradictory `required: true` + `default: ""` (required dropped — alt may be empty); round-trip paste in this handoff corrected to verbatim multi-line JSON output.
- security-reviewer: issues-fixed — secrets hygiene clean, refresh tokens stored as `tokenHash` only, permissions/status/language enums closed. Low finding fixed: the round-trip's negative checks now exit non-zero (and delete the stray doc) if a validator regresses, and cleanup runs in `finally`. TTL advisory recorded in Watch-outs.

## Next step

Phase 2 — OTP auth (log-delivered codes, no-enumeration, per-phone + per-IP rate limits), access JWT + rotating refresh with family reuse detection, DB-resolved permission middleware, `GET /auth/me`.
