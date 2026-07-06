# HANDOFF — Phase 2: Auth (OTP + rotating refresh + RBAC)

## What I built

- **OTP flow** (`services/otp.service.ts`): request resolves an active staff user by phone, mints a `crypto.randomInt` code, stores only its **HMAC-SHA256 hash** (keyed server-side, so a 6-digit code can't be reversed from a DB dump) in a Mongo `otps` collection (TTL-indexed on `expiresAt`), and prints the code to the server log (dev delivery, no SMS). No-enumeration is response-identical AND cost-identical: the unknown-phone branch performs an equivalent decoy upsert so both paths do one read + one write (security-review fix). The upsert races on the unique phone index fall back to a plain update. Verify uses an atomic `findOneAndUpdate` that enforces expiry and a 5-attempt cap while incrementing attempts, compares hashes with `crypto.timingSafeEqual` (against a decoy hash when no OTP exists), and consumes the OTP on success.
- **Sessions** (`services/token.service.ts`): HS256 access JWT (`expiresIn` from `JWT_ACCESS_TTL`, parsed to seconds at env validation) + opaque 48-byte refresh tokens stored as sha256 hashes with a `familyId`. Rotation marks the old record `rotated` atomically and issues a new token in the same family; presenting a non-active (replayed) or expired token, or racing a concurrent rotation, **revokes the entire family**. Logout revokes the family. Refresh-token TTL index keys off `expiresAt` only, so `rotated`/`revoked` records survive for reuse detection.
- **RBAC** (`middleware/auth.ts`, `services/permission.service.ts`): `requireAuth` verifies the JWT (algorithm pinned to HS256); `requirePermissions(...)` re-resolves the user's roles → permissions from the DB on every request (revocation is immediate; blocked users fail closed). `GET /auth/me` returns `{ id, name, roles, permissions }` as shared `MeResponse`.
- **Rate limiting** (`middleware/rate-limit.ts`): Mongo-backed fixed-window counters (TTL-cleaned), applied per-IP AND per-phone on both `/auth/otp/request` (10/ip, 3/phone per 5 min) and `/auth/otp/verify` (15/ip, 5/phone per 5 min); 429 with `Retry-After`.
- **Validation & errors**: zod `validateBody` on every auth route (E.164 phone, digit-only code, bounded refresh token), JSON body limit 1mb, JSON error handler that never leaks stack traces.
- **Bootstrap script** `scripts/ensure-admin.ts`: idempotently creates the system-locked `admin` role (all 10 catalogue permissions) and an admin user for a given phone.
- Shared types added: `ApiError`, `OtpRequestAck`, `TokenPairResponse`, `MeResponse`.

## Decisions & deviations

- `REDIS_URL` is blank, so OTP and rate-limit state live in Mongo (TTL indexes) as the kickoff's stated fallback; swapping to Redis later only replaces the two storage touchpoints.
- `requirePermissions` ships now (part of the phase's RBAC deliverable) but its first route consumers arrive with the write paths (Phase 6/8); its resolution path is the same `resolveUserAccess` proven live via `/auth/me`, and its permission-name type safety is proven below.
- No `trust proxy` set: `req.ip` is the socket address, so the IP rate limit cannot be spoofed via `X-Forwarded-For` in dev. Set `trust proxy` appropriately at deployment behind a proxy (noted for the deploy phase).
- Test admin seeded with dummy phone `+919999000001` (OTP comes from the log, so no real SMS number is needed).

## Verification (real output)

`pnpm -w typecheck`: `Tasks: 5 successful, 5 total` · `pnpm -w build`: `Tasks: 3 successful, 3 total, Time: 13.666s`.

Seed + boot against Atlas:

```
{"role":"admin","rolePermissions":10,"userId":"6a4b9be005f4694c0bacec69","userName":"Administrator","userStatus":"active"}
connected to mongodb database salil_sandesh
api listening on 0.0.0.0:4000
[otp] delivery for +919999000001: 839782
```

No-enumeration (identical bodies for known and unknown phone):

```
known-phone response: {"message":"if the phone is registered, a code has been sent"}
unknown-phone response: {"message":"if the phone is registered, a code has been sent"}
```

Login end to end (code taken from the server log):

```
wrong code -> 401 {"error":"invalid phone or code"}
verify ok -> access: eyJhbGciOiJIUzI1NiIsInR5c... refresh: aYPRQnAisvt_... (len 64)
me -> {"id":"6a4b9be005f4694c0bacec69","name":"Administrator","roles":["admin"],"permissions":["article:create","article:edit","article:publish","article:delete","media:upload","media:manage","category:manage","tag:manage","user:manage","role:manage"]}
```

Rotation, reuse detection, family revoke:

```
rotation -> old: aYPRQnAisvt_... new: -UDyV_jZB5_e... (different: True)
replay of rotated-out token -> 401 {"error":"invalid refresh token"}
post-reuse: NEW token also -> 401 {"error":"invalid refresh token"} (family revoked)
```

Rate limit (3/phone per 5 min; one request already spent in the window above), auth guard, input validation:

```
request 1 -> 200
request 2 -> 200
request 3 -> 429 {"error":"too many requests"}
request 4 -> 429 {"error":"too many requests"}
request 5 -> 429 {"error":"too many requests"}
me without token -> 401
malformed phone -> 400 {"error":"invalid request body"}
```

Types-live proof (added `requirePermissions("article:fly")` to a route, then reverted):

```
src/routes/auth.routes.ts(49,63): error TS2345: Argument of type '"article:fly"' is not assignable to parameter of type '"article:create" | "article:edit" | "article:publish" | "article:delete" | "media:upload" | "media:manage" | "category:manage" | "tag:manage" | "user:manage" | "role:manage"'.
```

Post-review hardening re-verified live (fresh boot, code `736097` from the log; decoy write for the unknown phone produced no log line and no login path):

```
hardened login ok -> Administrator roles=admin perms=10
decoy-phone verify -> 401 {"error":"invalid phone or code"}
```

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only. OTP codes appear ONLY in the server log, never in responses; refresh tokens are stored as sha256 hashes and OTP codes as server-keyed HMAC-SHA256 hashes.

## Watch-outs

- Access JWT carries only `sub` (user id); roles/permissions are always DB-resolved, so a role edit or user block takes effect on the next request, not at token expiry.
- Per-phone rate-limit keys are derived from the zod-validated E.164 phone, so the key space can't be polluted with arbitrary strings; IP keys use the raw socket address until `trust proxy` is configured at deployment.
- The seeded `+919999000001` admin is for dev verification; Phase 9's seed creates the real staff set, and any phone can be promoted via `ensure-admin`.

## Reviews

- build-reviewer: issues-fixed — deliverables, wiring, rate-limit numbers, HANDOFF authenticity (string-level cross-check, token length/format, ObjectId timestamps) all verified against uncached typecheck/build runs. One defect fixed: `ApiError` had no consumer; every error send site now carries `satisfies ApiError`, binding the shared error shape at compile time.
- security-reviewer: issues-fixed — secrets, OTP hygiene, rotation/reuse-detection (including the concurrent-rotation race failing safe), JWT algorithm pinning, DB-resolved RBAC, and injection surfaces all clean. Three findings fixed: (1) medium — unknown-phone OTP requests now perform an equivalent decoy DB write, closing the timing side-channel on enumeration; (2) low — OTP hashes are now HMAC-SHA256 keyed with a server secret instead of bare sha256 of a 10^6 code space; (3) low — the OTP upsert duplicate-key race now falls back to an update instead of throwing 500. Advisories recorded: set `trust proxy` to the exact hop count at deployment; malformed bodies 400 before touching rate-limit counters (accepted).

## Next step

Phase 3 — public read API: site config, categories, tags, article list/detail/by-author/by-tag/by-category with centralised `?lang=` fallback, search, batch author/cover resolution onto cards.
