# HANDOFF — Phase 5: Admin CMS foundation (`apps/admin`)

## What I built

- **BFF session**: the browser holds ONLY a first-party httpOnly cookie `ss_admin_session` containing the token pair sealed with **AES-256-GCM** (`lib/crypto.ts`, key = SHA-256 of `ADMIN_SESSION_SECRET`, versioned `v1.` format, IV+tag validated on unseal). Tokens never appear in browser JS, responses, `localStorage`, or `sessionStorage`. Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, 30-day max-age.
- **Auth route handlers** (`app/api/auth/*` — the only places cookies are written):
  - `request-otp` / `verify`: zod-validated proxies to the API's OTP endpoints; `verify` seals the token pair into the cookie and returns only `{ ok: true }`.
  - `refresh` (GET with sanitized `next` path — rejects `//` and absolute URLs): rotates the refresh token against the API and reseals the cookie — **rotation happens only here, never in RSC render** (RSC cannot write cookies; `requireUser` redirects expiring sessions to this handler).
  - `logout`: revokes the token family at the API and clears the cookie.
- **Session plumbing** (`lib/`): `session.ts` (read/write/clear sealed cookie), `jwt.ts` (decode-only expiry check, no verification — the API is the verifier), `api-proxy.ts` (server-side fetches to the API, `cache: no-store`), `require-user.ts` (RSC guard: no session → `/login`; expiring/rejected access token → refresh handler → back).
- **Login page** (`/login`): two-step phone→code client form using **TanStack Query** mutations against the BFF handlers (introduced here with the first real client mutations, per the Phase 4 deferral note); OTP code still comes from the API server log.
- **Permission-gated shell** (`app/(dashboard)/layout.tsx`): sidebar nav built from `lib/nav.ts` where each item declares its required permissions (typed `Permission[]` — mistyping one is a compile error); items render only when `GET /auth/me` (DB-resolved, per request) grants them. Dashboard page lists the resolved permissions. UI gating is UX only — the API's `requirePermissions` middleware remains the enforcement point for every future mutation.
- **`packages/editor-config` finalized** for text authoring: 10 nodes (doc, paragraph, text, heading, bulletList, orderedList, listItem, blockquote, horizontalRule, hardBreak) + 3 marks (bold, italic, link). The web renderer's compile-time parity (Phase 4 proof) covers exactly this set. The `image` node deliberately enters in Phase 7 with the media pipeline, where the parity guard will force renderer coverage in the same change.
- Admin app hardening: same security headers as web, root-`.env` loading in `next.config.mjs`, `ADMIN_SESSION_SECRET` required at first use (throws if missing).

## Decisions & deviations

- `SECRETS_ENC_KEY` remains unused (reserved; NewsCore inheritance) — the BFF seal uses `ADMIN_SESSION_SECRET` only.
- Refresh-via-GET redirect handler: state-changing but only rotates the caller's own session and never returns token material; `SameSite=Lax` + same-origin JSON POSTs cover the CSRF surface for the mutating handlers.
- Production verification note: under `next start`, the cookie carries `Secure` and the PowerShell client (correctly) refused it over plain http — that behavior is the Secure-flag proof; the functional flow below therefore ran on `next dev` (NODE_ENV=development) against the real API + Atlas.

## Verification (real output)

`pnpm -w typecheck`: `5 successful` · `pnpm -w build`: `3 successful` (admin build lists all four `/api/auth/*` as dynamic routes, `/login` static).

Full BFF login (OTP from the API server log), cookie inspection, admin shell:

```
verify -> 200 {"ok":true}
cookie flags: httponly=True samesite-lax=True sealed-v1=True raw-jwt-leak=False
dashboard -> 200
shell shows name: True
shell has users nav: True
shell has roles nav: True
shell has articles nav: True
dashboard shows resolved permission: True
```

Restricted role sees less (editor: article:create/edit/publish only):

```
editor dashboard -> 200
editor sees name: True
editor sees articles nav: True
editor sees users nav: False
editor sees roles nav: False
editor sees media nav: False
```

Server-side rotation via the route handler, then logout:

```
rotation changed sealed cookie: True
session valid after rotation: True
after logout / -> 307 (redirect to login)
```

Auth guard and rate-limit passthrough:

```
unauthenticated / -> 307 location=/login
login page -> 200
(3rd OTP request in window) -> 429 propagated by the BFF
```

Types-live proof (mistyped a nav permission, then reverted):

```
lib/nav.ts(16,46): error TS2820: Type '"media:uplod"' is not assignable to type '"article:create" | ... | "role:manage"'. Did you mean '"media:upload"'?
```

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only. Grep for `localStorage|sessionStorage|document.cookie` in `apps/admin` → no matches.

## Watch-outs

- `requireUser` runs `/auth/me` per RSC render — acceptable now; consider request-level memoization when the shell grows.
- The refresh handler redirects to `/login` on any rotation failure (including a reused token → family revoked at the API); users mid-session on a revoked family get a clean re-login, not an error page.
- Dev server was used for the cookie-flow verification (see decision note); reviewers re-running it need the API up (`tsx src/server.ts`) and a fresh OTP window (per-phone limit 3/5min).

## Reviews

- build-reviewer: PASS — deliverables verified against uncached runs (route table matches, cookie writes confined to route handlers by grep, TanStack dependency real, nav labels and types-live line/col character-exact, editor-config unchanged with web parity intact).
- security-reviewer: issues-fixed — BFF token confinement, AES-GCM implementation (fresh IV, tamper→null, length guards), cookie flags, CSRF posture, and input validation all clean. One medium finding (both reviewers converged on it independently): the refresh handler's `next` sanitizer allowed backslash-authority payloads (`/\evil.com` → WHATWG normalizes `\` to `/` → open redirect after rotation). Fixed with `/^\/(?![/\\])/` and proven with a Node repro: `/\evil.com`, `//evil.com`, `/\/evil.com`, and absolute URLs all now resolve to `/`, while `/articles?x=1` passes through.

## Next step

Phase 6 — article CRUD + TipTap editor built FROM editor-config + multilingual authoring tabs; server-side body validation against editor-config on write.
