# HANDOFF — Phase 8: Users & roles

## What I built

- **Staff CRUD** (`apps/api/src/services/user-admin.service.ts`, `/admin/users`): list, create (name + phone + roles → the user can OTP-login immediately, since auth resolves staff by phone), update (name/roles/bio), and soft deactivate/reactivate via `/users/:id/status`. There is deliberately **no hard delete** — deactivation is the soft-delete, matching the auth model (blocked users fail OTP verify and lose sessions on the next DB-resolved request). Slugs are generated from name + phone suffix; phone uniqueness → 409.
- **Roles CRUD** (`services/role-admin.service.ts`, `/admin/roles`): list, create, update, delete over the permission catalogue. `GET /admin/permissions` serves the catalogue grouped for the UI. System-locked roles (the seeded `admin`) reject edit and delete (409); a role assigned to any user cannot be deleted (409).
- **Self-lockout guards** (server-side, in the service layer — not UI):
  - You cannot remove your own administrator capability (self-deprivilege) or deactivate your own account.
  - The **last administrator** cannot be deprivileged or deactivated, even by another manager. "Administrator" is defined as holding **`role:manage`** (the privilege-granting permission — the one capability the system must never lose its last holder of); the guard counts *other active* `role:manage` holders and blocks the write when that count is zero.
  - The same invariant is enforced at the **role-edit** path: stripping `role:manage` from a role that has active users, when no other admin-granting role has an active user, is rejected (`LastAdminRoleError` → 409). This closes the bypass where an admin could otherwise neutralize all administration by editing the sole admin role instead of a user.
- **RBAC**: all `/admin/users` routes require `user:manage`, all `/admin/roles` + `/admin/permissions` require `role:manage`, resolved from the DB per request. The admin UI (`/users`, `/roles` pages, gated shell nav) mirrors this for UX only.
- **Admin UI**: `/users` (create form with role toggles, table with role badges, status, activate/deactivate) and `/roles` (create/edit form with catalogue permissions grouped by area, list with system-lock badges and edit/delete), both over the session-resealing BFF (`/api/bff/users`, `/api/bff/roles`, `/api/bff/permissions`), all ids ObjectId-checked before proxying.
- Shared types added: `UserSummary`, `RoleRef`, `RoleSummary`, `PermissionCatalogueEntry` — consumed by both API serializers and the admin components.

## Decisions & deviations

- "Admin" = `role:manage` holder (not `user:manage`). Rationale: `role:manage` is the ability to grant/revoke any permission; losing its last holder is the true unrecoverable lockout. This also makes the last-admin guard reachable and testable by a `user:manage`-only manager (proven below), rather than being redundant with the self guard.
- Self-deprivilege guard targets the admin (`role:manage`) capability specifically — the critical lockout — plus a blanket block on self-deactivation.
- User update replaces the full role set (assignment is idempotent); role update replaces the full permission set.
- No hard-delete endpoint for users (soft deactivate only), per the security model; the seeded test/manager users from verification remain as inert deactivated/reassigned accounts.

## Verification (real output)

`pnpm -w typecheck`: `5 successful` · `pnpm -w build`: `3 successful`.

End-to-end against Atlas (admin OTP-login, code from server log; the created user then OTP-logs in themselves):

```
create user -> 201 roles: editor
new user OTP-login /auth/me perms: article:create,article:edit,article:publish
editor hits /admin/users (needs user:manage) -> 403 forbidden
duplicate phone -> 409 a user with this phone already exists
admin self-deprivilege -> 409 you cannot remove your own administrator role
admin self-deactivate -> 409 you cannot deactivate your own account
manager deprivileges the last role:manage admin -> 409 cannot remove the administrator role from the last admin
manager deactivates the last admin -> 409 cannot deactivate the last admin
deactivate editor -> 200 status: blocked
blocked user can OTP-login: false (should be false)
delete role assigned to users -> 409 cannot delete a role that is assigned to users
edit system-locked admin role -> 409 system roles cannot be modified
create role -> 201 perms: tag:manage
delete unused role -> 200
```

Role-edit last-admin guard (added per security review), staged live so role R is the sole active admin-granting role, then relaxed:

```
U deactivates seed admin (allowed, U is another admin) -> 200
strip role:manage from R while it is the SOLE active admin role -> 409 cannot remove administrator access from the last role that grants it
cleanup: seed admin reactivated -> 200
strip role:manage from R while seed admin active again -> 200 (200 = allowed, another admin exists)
```

Types-live proof (set `RoleSummary.systemLocked` to a string in the serializer, then reverted):

```
src/services/role-admin.service.ts(37,5): error TS2322: Type 'string' is not assignable to type 'boolean'.
```

Secret hygiene: `git ls-files` filtered for `.env` → `.env.example` only.

## Watch-outs

- The last-admin guard hinges on `role:manage` being the admin marker. If a future role model renames or splits that permission, update `adminPermission` in `user-admin.service.ts` (single constant).
- Deactivating a user does not proactively revoke their refresh-token families; their access is cut on the next request because permissions/status are DB-resolved and OTP verify checks `status: active`. A background family-revoke on deactivate could be added later if instant session kill is required.
- Verification left a test staff user and an ex-manager (reassigned to editor) in Atlas — inert; Phase 9's seed is the authoritative staff set and is idempotent.

## Reviews

- build-reviewer: PASS — deliverables, wiring, DB-per-request RBAC, self-lockout/last-admin ordering, shared-type consumption, and all seven HANDOFF error strings verified verbatim against source; typecheck/build green; no comments, no scope creep.
- security-reviewer: issues-fixed — RBAC coverage, trustworthy actor identity (JWT `sub`, never client-supplied), user-layer self-lockout/last-admin guards, enum-constrained permissions, and BFF confinement all clean. One Medium finding fixed: `updateRole` could strip `role:manage` from the sole admin role, bypassing the last-admin invariant; added a guard (`LastAdminRoleError` → 409) and proved it live (block when sole, allow when another admin exists). Accepted notes: `role:manage` is by definition full self-escalation (intended admin power); the lowercase-hex ObjectId regex fails closed on uppercase input (all ids originate from our own lowercase API); `dev-seed` seeds no admin (the OTP-loginable admin is bootstrapped by `ensure-admin` / Phase 9 seed).

## Next step

Phase 9 — seed + finalize: idempotent NewsData.io-driven seed (~40 Hindi articles with generated TipTap bodies, some manual English translations, ~6 staff across roles, one OTP-loginable admin), then a final full-app review pass.
