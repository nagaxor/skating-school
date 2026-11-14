# CLAUDE.md — Project Brain

> **Standing rule for Claude:** this file is the single source of truth for this project.
> 1. **Read it fully before starting any task.**
> 2. **After every change** (code, config, deps, schema, env, docs), update the relevant sections here
>    *and* add a dated entry to the **Changelog** at the bottom — in the same piece of work, before finishing.
> 3. If something here is wrong or stale, fix it. Move finished items out of **Upgrade backlog** into the Changelog.
> 4. Never put real secrets or production credentials in this file.

---

## 1. What this project is

**Online Skating School**: a management app for a roller-skating academy in Bangladesh.
It covers students, instructors, branches ("clubs"), attendance, fees/payments, receipts, schedules, notices, public online admission, and staff/roles. It's installable as a PWA, and the currency/payment methods are local (cash, bKash, Nagad, Rocket, bank transfer).

Production target is **Vercel + Neon PostgreSQL**. There is **no demo data**; the first admin is created with a bootstrap script.

## 2. Tech stack

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router), JavaScript (no TS) | 15.5.22 |
| UI | React, Tailwind CSS 3 (`darkMode: class`) | 19.2.8 / 3.4.17 |
| DB / ORM | PostgreSQL (Neon in prod), Prisma | Prisma 6.19.2 |
| Auth | JWT (`jose`, HS256) in HTTP-only cookie `oss-token`, 12h session; `bcryptjs` hashing | |
| Validation | Zod 4 (`src/lib/validation.js`) | 4.1.5 |
| Lint | ESLint 9 flat config + `next/core-web-vitals` | |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights` are **installed but not rendered anywhere** (see backlog) | |
| Node | `.nvmrc` = 20; engines `>=20.9.0` (local machine runs Node 24, which works) | |

Path alias: `@/*` → `src/*` (jsconfig.json).

## 3. Architecture map

```
src/
  middleware.js          Cookie-presence gate for /dashboard/* and /api/*; public: POST/DELETE /api/auth,
                         GET /api/health, POST /api/admission, GET /api/clubs. Full JWT check happens in API layer.
  lib/
    auth.js              sign/verify JWT, set/remove cookie, json()/401/403 helpers
    access.js            getAuthContext() (re-loads user from DB each request; DB errors → null → 401),
                         requireContext(roles), assertSameOrigin(request)  ← call on every state-changing route
    db.js                Prisma singleton
    validation.js        All Zod schemas. passwordSchema = policy for NEW passwords (8+, letter+number);
                         login uses a loose schema. photoDataUrlSchema = PNG/JPEG/WebP base64 only (no SVG).
    security.js          clientIp(request), audit({actorId,action,target,meta,request}) (never throws),
                         LOCKOUT policy (5 failures → 15 min), initialsOf(name)
    rate-limit.js        In-memory bucket limiter (per process!)
    api.js               Client fetch wrapper (redirects to /login on 401)
    auth-context.js      Client AuthProvider/useAuth
    theme-context.js     Dark mode (localStorage key `oss-theme`)
  components/            DashboardShell (nav/sidebar), ui.js (shared UI), Icons.js, PWARegister.js
  app/
    page.js              Public landing page
    login/, admission/   Public pages (admission = long public application form, incl. photo data URL)
    dashboard/           Authenticated area: attendance, branches, fees, notices, payment-history, profile,
                         receipt/[id], reports, schedule, settings, staff, students, students/[id]
    api/<resource>/route.js   admission, attendance, audit, auth(+password, +sessions), clubs, health,
                              instructors, notices, payments, receipts, schedules, settings, staff(+role),
                              students, users/status, users/password
prisma/
  schema.prisma          Models: User(role admin|instructor|student), Instructor, Student, Club, Attendance,
                         Payment, Schedule, Notice, Setting, AuditLog
  migrations/            0001_init, 0002_student_admission_details, 20261114160022_security_hardening
  bootstrap-admin.mjs    Creates/resets one admin from ADMIN_EMAIL/ADMIN_NAME/ADMIN_PASSWORD (≥12 chars)
scripts/localdb.py       Local isolated Postgres manager (see §4)
scripts/security-smoke.mjs  E2E security test against the running local app (`npm run test:security`)
```

### API route pattern (follow this for new routes)
1. `if (!assertSameOrigin(request)) return json({error:"Invalid origin"},403)` for POST/PUT/PATCH/DELETE
2. `const { ctx, response } = await requireContext(["admin", ...]); if (response) return response;`
3. Parse the body with a Zod schema from `validation.js` (`safeParse`, then 400 on failure)
4. Scope the data: **instructors → only their club; students → only their own records**
5. Return through `json(...)` (sets `Cache-Control: no-store`)
6. For any create/update/delete of money, people, roles, or settings, call `await audit({...})` from `lib/security.js`

### Security model (keep it intact)
- Roles: `admin` (everything), `instructor` (own club), `student` (self only).
- CSP and security headers are in `next.config.js`. Adding any external script/CDN means updating the CSP.
- Public admission is rate-limited and can create only `student` users.
- **Session revocation:** every JWT has `sv` = `User.sessionVersion`, which `getAuthContext()` checks.
  Bumping `sessionVersion` kills all of that user's sessions. It is bumped on: password change (current device gets a new cookie),
  admin password reset, deactivation, role change, and "sign out everywhere" (`DELETE /api/auth/sessions`).
  `signToken(user)` takes the user ROW (it reads `sessionVersion`), not a hand-built payload.
- **Login:** a generic error for an unknown email or a wrong password; a dummy bcrypt compare for unknown emails (no timing leak);
  per-account lockout stored in the DB (`failedLogins`, `lockedUntil`) → 423; plus a per-IP in-memory limit (20 per 15 min).
- **Accounts:** admins can (de)activate any account and reset passwords (`/api/users/status`, `/api/users/password`);
  instructors can (de)activate only students in their own branch. Self-changes and removing the last admin are blocked.
- **Audit log:** `AuditLog` table (actor is SetNull on user delete). Admins read it via `GET /api/audit?cursor=&action=`.
- Dashboard layout uses `getAuthContext()`, so revoked or deactivated sessions can't render pages either.
- Headers: CSP (+ object-src none, upgrade-insecure-requests in prod), COOP/CORP same-origin, HSTS in prod.
  CSP still needs `'unsafe-inline'` for scripts (Next inline runtime + theme script). Nonce-based CSP is in the backlog.

## 4. Local environment (isolated, nothing installed system-wide)

**How it's isolated:**
- **Database:** real PostgreSQL **16.2** binaries from the `pgserver` pip package, inside a project-local
  **Python 3.12 venv at `.venv/`** (created with `uv`, because pgserver has no Windows wheel for Python 3.13).
  Data lives in **`.localdb/`** (gitignored), listens on **127.0.0.1:5433** only.
  It is completely separate from Neon production.
- **App:** Node deps live in `node_modules/` (project-local).
- **Config:** `.env` (gitignored) is generated by `localdb.py setup` and points at the local DB with a random local `JWT_SECRET`.

Local DB credentials (local only): user `skating`, password `skating_local`, db `skating_school`.
`DATABASE_URL=postgresql://skating:skating_local@127.0.0.1:5433/skating_school?schema=public`

### Daily use
```powershell
npm run local:dev          # starts local Postgres (if stopped) + next dev → http://localhost:3000
npm run local:db:stop      # stop Postgres when done
npm run local:db:status
npm run local:db:psql      # SQL shell
npx prisma studio          # GUI for the DB
```
Reset all local data: `.venv\Scripts\python.exe scripts/localdb.py reset`, then run setup again.

### Fresh machine / rebuild from scratch
```powershell
# 1) Python venv with Python 3.12 (uv downloads 3.12 privately)
python -m pip install --user uv          # or any way of getting uv
uv venv .venv --python 3.12
uv pip install --python .venv\Scripts\python.exe -r requirements-dev.txt
# 2) DB + .env
npm run local:db:setup
# 3) App
npm ci
npx prisma migrate deploy
$env:ADMIN_EMAIL="admin@local.test"; $env:ADMIN_NAME="Local Admin"; $env:ADMIN_PASSWORD="<12+ chars>"
npm run db:bootstrap-admin
npm run dev
```

Local admin login: `admin@local.test` (password was given to the owner at setup and isn't stored here;
to reset it, re-run `db:bootstrap-admin` with a new password).

### Verifying a change
- `npm run lint` (baseline: 0 errors, 1 warning in eslint.config.mjs)
- `npm run build`
- `curl http://localhost:3000/api/health` → `{"status":"ok","database":"ok"}`
- Manually smoke-test login, attendance, payment → receipt, admission, and role restrictions.
- `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:security`: 23 end-to-end security checks (local only; it refuses a non-localhost URL).
  It creates and deletes a temporary instructor. Run it after touching auth/access/API code.
- There are no unit tests yet.

## 5. Conventions
- JavaScript only, App Router, `"use client"` pages under dashboard fetch through `src/lib/api.js`.
- New DB changes: edit `schema.prisma`, then `npx prisma migrate dev --name <name>` locally (creates the migration folder; commit it).
  Prod uses `prisma migrate deploy` only. Never `migrate reset` against prod.
- Dark mode: always pair light classes with `dark:` variants (recent commits did a dark-mode pass).
- Commit style: conventional commits (`feat:`, `fix:`, …).

## 6. Known issues / gotchas
- `DEPLOY.md` references `DEPLOY-CLOUDFLARE.md`, which doesn't exist.
- Commits 60da055/3a259c2 say Analytics/SpeedInsights were added, but `src/app/layout.js` doesn't render them.
- `rate-limit.js` is in-memory, so on Vercel serverless each instance has its own counters (weak protection).
- Student `photo` is stored as a base64 data URL in Postgres (fine for small use, bloats the DB at scale).
- Login rate limit keys on `x-forwarded-for`; locally that's missing, so all requests share the key `login:unknown`.
- `npm audit`: several dev-tooling advisories (brace-expansion, js-yaml, effect, deepmerge-ts). Mostly transitive via eslint/prisma.

## 6b. Git workflow & restore points
- Remotes:
  - `origin` = `github.com/nagaxor/skating-school` (**owner's own repo, kept PRIVATE**). Push here.
  - `upstream` = `github.com/ShahriyarH10/skating-school` (original, read-only for us; `git fetch upstream` to get its updates).
- The original repo's Vercel project auto-deploys *its* `main` to production. Do the work on a branch and merge only when it's verified.
- Working branch: `local-dev-setup`.
- Before each bigger change, create an annotated tag `checkpoint-YYYY-MM-DD-<topic>` so the owner can roll back:
  - see the code at that point: `git checkout <tag>`
  - undo everything after it on the current branch: `git reset --hard <tag>` (destructive, so confirm first)
- Tags so far: `checkpoint-2026-11-14-local-setup` (local env + this file).
- `nagaxor` has no write access to `upstream` (403 on 2026-11-14), which is why the owner's own repo is `origin`.
- Push: `git push -u origin main local-dev-setup --follow-tags`.

## 7. Upgrade backlog (prioritized — pick from the top; move to Changelog when done)
1. **Safe patch/minor bumps:** react/react-dom 19.3, zod 4.6, jose 6.2, postcss, autoprefixer, bcryptjs, speed-insights; then `npm audit fix` (non-force).
2. **Wire up or remove** Vercel Analytics/SpeedInsights in `layout.js` (check the CSP allows it).
3. **Add a test setup** (e.g. Vitest for lib/validation + API route tests against the local DB) and add it to `npm run check`.
4. **Next.js 15 → 16** (middleware → `proxy.js` rename, eslint-config-next 16, ESLint 10). Run the official codemod.
5. **Prisma 6 → 7** (new `prisma.config.ts`, driver adapters, generator changes). Do this as its own step.
6. **Tailwind 3 → 4** (CSS-first config); large visual diff, so do it last.
7. Persistent rate limiting (DB table or Upstash) instead of in-memory.
8. Move student photos to object storage (Vercel Blob/S3) instead of DB data URLs.
9. Consider a TypeScript migration (incremental, `allowJs`).

---

## Changelog
<!-- Newest first. Format: YYYY-MM-DD — what changed — files touched -->
- **2026-11-14** — **Redesign phase 1: security hardening** (branch `redesign`, restore point `checkpoint-2026-11-14-before-redesign`).
  Migration `security_hardening` (User.sessionVersion/failedLogins/lockedUntil/lastLoginAt + AuditLog). Session revocation via `sv`,
  DB-backed login lockout, timing-safe login, password policy (letter+number) for new passwords, raster-only photo validation,
  audit logging on all sensitive mutations, new endpoints: `DELETE /api/auth/sessions`, `PATCH /api/users/status`,
  `POST /api/users/password`, `GET /api/audit`, `PATCH /api/students`, `DELETE /api/notices`, `DELETE /api/schedules`.
  Instructor DELETE now validates its id. Role changes revoke sessions. Extra security headers. Dashboard layout uses getAuthContext.
  Added `scripts/security-smoke.mjs` (23/23 pass). Files: prisma/schema.prisma, prisma/migrations/*, src/lib/{security,access,auth,validation}.js,
  src/app/api/**, src/app/dashboard/layout.js, src/app/admission/page.js (password hint), next.config.js, package.json.
- **2026-11-14** — Moved hosting to the owner's own GitHub: renamed `origin`→`upstream` (ShahriyarH10) and added `origin` = nagaxor/skating-school. Merged the repo's existing `test.md` commit into `main` (owner chose to keep it), then merged `main` into `local-dev-setup`. Files: `CLAUDE.md`, `test.md` (from remote).
- **2026-11-14** — Committed the local setup on branch `local-dev-setup` and tagged `checkpoint-2026-11-14-local-setup`. Push to GitHub failed (403, no write access for `nagaxor`). Added §6b Git workflow. Files: `CLAUDE.md`.
- **2026-11-14** — Set up the isolated local environment: Python 3.12 `.venv` with `pgserver` (Postgres 16.2), `scripts/localdb.py`
  (setup/start/stop/status/reset/psql on 127.0.0.1:5433), `npm run local:*` scripts, generated local `.env`, added `.env.example`,
  `requirements-dev.txt`, gitignored `.venv/` and `.localdb/`. Applied migrations 0001–0002 locally, created local admin
  `admin@local.test`. Verified: `/api/health` ok, admin login ok, `/` 200, lint 0 errors. Created this CLAUDE.md.
  Files: `CLAUDE.md`, `scripts/localdb.py`, `package.json`, `.gitignore`, `.env.example`, `requirements-dev.txt`.
