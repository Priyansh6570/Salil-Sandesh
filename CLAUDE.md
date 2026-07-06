# CLAUDE.md — Salil Sandesh

Persistent config for this repository. Read fully at the start of every session. These are standing conventions; the current task is defined by the kickoff prompt / the latest `HANDOFF.md`.

---

## 1. What this is

**Salil Sandesh** — a **single-tenant, multilingual news platform** (public website + admin CMS). One newspaper, one brand, one database. Hindi is the default language; articles can carry translations in other languages, added either manually by staff or via an in-app AI translation feature.

This is NOT a multi-tenant SaaS. There is **no** tenant resolution, **no** per-tenant databases, **no** platform/super-admin realm, **no** white-label theming. One brand, configured statically.

---

## 2. The one rule that is never broken

**NO COMMENTS IN CODE. ANYWHERE. EVER.**

No explanatory comments, no `//`, no `/* */`, no JSDoc, no docstrings, no "TODO", no section-divider comments, no comments even in config files where syntactically legal. Code must be self-documenting through precise naming and small functions. If a piece of logic feels like it needs a comment, rename or refactor until it doesn't. This is an absolute, non-negotiable project rule. A reviewer finding a single comment is a defect to fix.

(Prose lives in `HANDOFF.md` and commit messages — never in source.)

---

## 3. Tech stack

- **Monorepo:** pnpm workspaces + Turborepo. Windows dev environment — use cross-platform scripts (no bash-only assumptions in package scripts).
- **`apps/api`** — **Express + TypeScript** + Mongoose (MongoDB Atlas). Structure: `config/ controllers/ middleware/ models/ routes/ services/ utils/`. TypeScript strict.
- **`apps/web`** — Next.js 14 (App Router) + **shadcn/ui** + TanStack Query. The public reading site.
- **`apps/admin`** — Next.js 14 (App Router) + **shadcn/ui** + BFF pattern. The CMS.
- **`packages/shared`** — shared TypeScript types (Article, User, Category, etc.). This is the type contract between the Express API and both frontends — it replaces NestJS's OpenAPI codegen. API responses and frontend consumers both import from here so they cannot drift.
- **`packages/editor-config`** — the authoritative TipTap node/mark allow-list. The editor builds its extensions from it, the public renderer covers exactly it, and the API validates article bodies against it. Editor · validator · renderer derive from ONE source so they cannot disagree.

Design: **shadcn/ui** for all UI, both apps. Single brand; theme via shadcn's token layer (CSS variables) so a future re-theme is a token swap, not a component rewrite.

---

## 4. Architecture (single-tenant)

- **One MongoDB database.** Collections: users, articles, categories, tags, media, roles, refresh_tokens (+ otp state in Redis or Mongo).
- **Brand/site config is static** — a config file or env, not a per-tenant document.
- **Multilingual articles:** an article embeds `translations` keyed by language code (`hi`, `en`, …) — each holding `{ title, excerpt, body (TipTap JSON), slug }`. `defaultLanguage` = `hi`. Shared fields (category, author, tags, cover media, flags, publishedAt, status) live on the article, not per-translation. A reader requests a language; the site serves that translation if present, else falls back to the default. Translations are added/edited manually by staff via per-language tabs in the editor.
- **AI translation: DEFERRED** — a post-project feature, not built in this run. The data model already supports arbitrary language versions, so AI-assisted translation slots in later as an admin action that produces a reviewable draft (validated against `packages/editor-config` before saving). Do not build it now; leave the model translation-ready.

---

## 5. Security model (kept from NewsCore — do not weaken)

- **Auth:** phone + OTP. **No real SMS** — the OTP code is printed to the API server log (dev delivery). OTP flow is no-enumeration (identical response whether or not the phone is a real user) and rate-limited (per phone + per IP) on request and verify.
- **Sessions:** short-lived access JWT + **rotating refresh tokens with reuse detection** (a replayed rotated-out token revokes the whole session family). Refresh state persisted in Mongo.
- **BFF:** the admin browser holds ONLY a first-party httpOnly cookie sealing the tokens (AES-GCM, server-side). Tokens never touch browser JS. No `localStorage`/`sessionStorage` for tokens.
- **RBAC:** permissions resolved from the DB per request (not the token snapshot), so revocation is immediate. Guards enforce server-side; the frontend gates on resolved permissions for UX only. Self-lockout guards (a tenant/admin cannot remove the last admin or lock itself out).
- **Body rendering:** typed TipTap walker, **no `dangerouslySetInnerHTML`** on stored content. Unknown node → visible fallback, never a silent drop. Server validates bodies against the editor config on write.
- **Media/images:** uploads go through the pipeline onto the controlled origin; `next/image` `remotePatterns` allowlists only that origin — no wildcard host. No raw-URL image entry anywhere.

---

## 6. Secrets & the public repo (CRITICAL — this repo is PUBLIC)

- `.env` is gitignored from the first commit. **Verify `git ls-files | grep -iE "\.env"` returns nothing before every push.** A committed secret in a public repo is a breach.
- Commit `.env.example` with placeholder values only.
- Every credential (Atlas URI, Anthropic key, News API key, R2 keys, generated secrets) lives ONLY in `.env` locally and in the host dashboard in deployment. Never in source, never in a committed file, never in `HANDOFF.md`.
- Env validation throws on any missing required var at boot (fail fast, never a silent default for a secret).

---

## 7. Conventions

- **`HANDOFF.md`** at repo root: updated after every phase/major change. Reviewer-facing, latest-task-only, fixed structure (What I built · Decisions & deviations · Verification with REAL results · Watch-outs · Next step). **Real command output only — never fabricate verification.**
- **Commits:** small, directly to `main`, pushed to origin after each phase. Clear messages. `.env` never staged.
- **Verification discipline (every phase):** typecheck passes, build passes, a real run against Atlas, and where types are involved a "types-live" proof (deliberately mistype a field → confirm the compiler errors → revert). Paste real output into `HANDOFF.md`.
- **Annotate-as-you-consume:** add typed shapes to `packages/shared` as endpoints are built and consumed; don't gold-plate ahead of need.
- **No scope creep:** build what the current phase specifies. Defer extras with a note rather than building them.

---

## 8. Subagent review protocol (mandatory after each phase)

After completing a phase and before starting the next, invoke BOTH review subagents (defined in `.claude/agents/`):

- **`build-reviewer`** — verifies the phase's deliverables exist and work: typecheck, build, the real run, and that the phase's stated goals are actually met (not just compiling). Flags missing pieces and fabricated/absent verification.
- **`security-reviewer`** — audits the phase's security surface against the model in §5–§6: auth/session correctness, RBAC enforcement (server-side, not just UI), secret handling, injection/XSS surfaces, the public-repo secret check, and any client-trusted input.

Address every finding before proceeding. Record both reviews' outcomes (pass / issues-fixed) in `HANDOFF.md`. A phase is not "done" until both reviewers pass.

---

## 9. What to optimize for

Correctness and security over speed; small proven vertical slices over big unproven ones; the type contract (`packages/shared`) and the editor-config single-source-of-truth as the two invariants that keep the system honest. When a NewsCore pattern applies, reuse its shape — this project is a leaner, single-tenant descendant of it.
