# HANDOFF — Phase 0: Guardrails, scaffold, review agents

## What I built

- Git repo on `main` with origin `https://github.com/Priyansh6570/Salil-Sandesh.git`.
- Guardrails first: `.gitignore` (`.env`, `.env.*`, `!.env.example`, build outputs, `next-env.d.ts`), committed `.env.example` with placeholders, local `.env` created with empty values (human has since filled `MONGODB_URI`).
- pnpm + Turborepo monorepo: `apps/api` (Express + TS + Mongoose + zod env validation), `apps/web` and `apps/admin` (Next.js 14 App Router, Tailwind + shadcn token layer, `components.json` ready for shadcn CLI), `packages/shared` (type contract; exports `HealthResponse`), `packages/editor-config` (initial TipTap node/mark allow-list, finalized in Phase 5).
- Review subagents at `.claude/agents/build-reviewer.md` and `.claude/agents/security-reviewer.md`.
- API bootstrap: env validation throws on missing/empty required vars; Mongo connects to Atlas (`DB_NAME` from env); listens on `PORT ?? API_PORT` bound to `0.0.0.0`; `GET /health` typed as `HealthResponse` from `packages/shared`.

## Decisions & deviations

- Internal packages export TypeScript source directly (`exports` → `src/index.ts`); Next apps use `transpilePackages`, the API bundles them via tsup (`noExternal`). No per-package build step needed.
- `next-env.d.ts` is gitignored because Next regenerates it with comments (project rule: no comments anywhere). It is recreated by any `next dev`/`next build`; run a build once after a fresh clone before bare `tsc`.
- Env schema currently requires only what Phase 0 consumes (`MONGODB_URI`, `DB_NAME`); later phases add their vars as they consume them (annotate-as-you-consume). JWT/OTP/R2 values are still blank in `.env` — needed from Phase 2 onward.
- `pnpm-workspace.yaml` approves build scripts for `esbuild` and `sharp` only (pnpm 10 blocks postinstall by default).

## Verification (real output)

`pnpm -w typecheck`:

```
 Tasks:    5 successful, 5 total
Cached:    0 cached, 5 total
  Time:    3.386s
```

`pnpm -w build` (tsup + two Next production builds):

```
@salil-sandesh/api:build: ESM dist\server.js 1.72 KB
@salil-sandesh/web:build:  ✓ Generating static pages (4/4)
@salil-sandesh/admin:build:  ✓ Generating static pages (4/4)
 Tasks:    3 successful, 3 total
```

Real boot against Atlas (`tsx src/server.ts`):

```
connected to mongodb database salil_sandesh
api listening on 0.0.0.0:4000
```

`GET http://localhost:4000/health`:

```
StatusCode : 200
Content    : {"ok":true}
```

Fail-fast env validation (booted with `MONGODB_URI=` empty):

```
Error: Environment validation failed: MONGODB_URI: String must contain at least 1 character(s)
exit code: 1
```

Types-live proof (changed `res.json({ ok: true })` to `{ ok: "yes" }`, then reverted):

```
src/controllers/health.controller.ts(5,14): error TS2322: Type 'string' is not assignable to type 'boolean'.
```

Secret hygiene (`git ls-files` filtered for `.env`):

```
.env.example
```

## Watch-outs

- `.env` still has blank `JWT_ACCESS_SECRET`, `ADMIN_SESSION_SECRET`, `SECRETS_ENC_KEY`, `NEWS_API_KEY`, and all `R2_*` values. Phase 2 needs the three generated secrets; Phase 7 needs R2; Phase 9 needs the NewsData key.
- `REDIS_URL` is blank — OTP/rate-limit state will use the Mongo/in-memory fallback path when built.
- Turbo remote caching is off; all runs are local.

## Reviews

- build-reviewer: issues-fixed — all deliverables, verification authenticity, shared-type consumption, and the no-comments rule verified against uncached typecheck/build runs; sole defect was that the phase had not yet been committed/pushed, resolved by this commit.
- security-reviewer: issues-fixed — secrets hygiene, fail-fast env validation, and Express bootstrap all clean; low-severity finding (local `.claude/scheduled_tasks.lock` would have been committed) fixed by ignoring `.claude/*` except `.claude/agents/`.

## Next step

Phase 1 — Mongoose models (User, Role, Article with `translations` map, Category, Tag, Media, RefreshToken) plus matching types in `packages/shared`, with a schema-level round-trip against Atlas.
