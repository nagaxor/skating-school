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
  components/
    ui.js                Shared UI kit + `cx` class tokens: Badge, Avatar, StatCard, PageHeader, ModalShell (ESC closes),
                         ConfirmDialog (use instead of window.confirm), Toast (auto-dismiss), SearchInput, Spinner, EmptyState
    Brand.js             LogoMark / Logo / Wordmark + RinkLines motif (SVG; uses useId for unique gradient ids)
    DashboardShell.js    Sidebar, top bar, mobile tab bar + "More" sheet, Ctrl/Cmd+K command palette
    CommandPalette.js    Palette UI (items = nav + quick actions, filtered by role)
    AccountActions.js    ResetPasswordModal, generatePassword(), strongPassword(), PASSWORD_HINT
    GuardianHome.js      Guardian portal home (child cards) + useMyChildren() hook, TODAY status map
    AttendanceGrid.js    12-week Sat→Fri attendance grid + recent list (staff student page + guardian child page)
    SiteShell.js         Public-site chrome: dark nav (active link = lime underline, mobile menu), footer, mobile CTA bar,
                         PageHero, Section, SectionHead, CtaBand, `dark` class tokens. ALL public pages use the dark look.
    site/*Content.js     Home/Programs/Why/Branches/Faq page bodies + PortalPreview (client components)
    Icons.js, PWARegister.js
  lib/fees.js            PROGRAM_FEES (Beginner 2000 / Intermediate 2500 / Advanced 3000) + balanceHistory() (≤12 months, paid/partial/due
                         by matching monthly_fee payments to "Month YYYY" labels)
  lib/site-content.js    Public copy: CONTACT, STATS, PROGRAMS, INCLUDED, FEATURES, STEPS, FAQ, NAV (edit text here)
  lib/csv.js             downloadCsv(filename, rows, columns): client CSV export, formula-injection safe, UTF-8 BOM
  app/
    page.js              Public home (hero, stats, explore cards, admission steps, CTA)
    programs/, why-us/, branches/, faq/   Separate public pages (server page.js = metadata; content in components/site/*).
                         branches/ reads active clubs from the DB per request (force-dynamic).
    login/, admission/   Public pages (admission = long public application form, incl. photo data URL)
    dashboard/           Authenticated area: activity (admin audit log), attendance, branches, children/[id] (guardian),
                         guardians (admin), fees, notices,
                         payment-history ("Fee Tracker"), profile ("Profile & Security"), receipt/[id], reports,
                         schedule, settings, staff, students, students/[id]
    api/<resource>/route.js   admission, attendance, audit, auth(+password, +sessions), clubs, health,
                              instructors, notices, payments, receipts, schedules, settings, staff(+role),
                              students, users/status, users/password, guardians (admin), my-children (guardian)
prisma/
  schema.prisma          Models: User(role admin|instructor|student), Instructor, Student, Club, Attendance,
                         Payment, Schedule, Notice, Setting, AuditLog, GuardianLink (guardian User ↔ Student, many-to-many, relation)
  migrations/            0001_init, 0002_student_admission_details, 20261114160022_security_hardening, *_guardian_portal
  bootstrap-admin.mjs    Creates/resets one admin from ADMIN_EMAIL/ADMIN_NAME/ADMIN_PASSWORD (≥12 chars)
scripts/localdb.py       Local isolated Postgres manager (see §4)
scripts/security-smoke.mjs  E2E security test against the running local app (`npm run test:security`)
```

### Authorization rules (READ before touching any API) — IDOR protection
- **Allow-list roles, never deny-list.** Use `isStaff(ctx)` / `isAdmin(ctx)` from `lib/access.js`. Writing `role === "student" → 403`
  is forbidden: when the `guardian` role was added (2026-11-14), every such check would have given guardians staff access.
- **All student-related reads go through `studentScope(ctx)`** (admin {} · instructor own club · student self · guardian linked children ·
  unknown role → nothing). Pattern: `db.student.findFirst({ where: { id, ...studentScope(ctx) } })`,
  `db.payment.findMany({ where: { student: studentScope(ctx), ...(studentId && { studentId }) } })`. A query filter may only NARROW the scope.
- Out-of-scope single records return **404, not 403**, so ids can't be probed.
- Schedules and notices use `visibleClubIds(ctx)` (null = all).
- Linking a guardian to a child grants data access, so **only admins** can do it (`/api/guardians`).

### API route pattern (follow this for new routes)
1. `if (!assertSameOrigin(request)) return json({error:"Invalid origin"},403)` for POST/PUT/PATCH/DELETE
2. `const { ctx, response } = await requireContext(["admin", ...]); if (response) return response;`
3. Parse the body with a Zod schema from `validation.js` (`safeParse`, then 400 on failure)
4. Scope the data: **instructors → only their club; students → only their own records**
5. Return through `json(...)` (sets `Cache-Control: no-store`)
6. For any create/update/delete of money, people, roles, or settings, call `await audit({...})` from `lib/security.js`

### Security model (keep it intact)
- Roles: `admin` (everything), `instructor` (own club), `student` (self only), `guardian` (read-only: linked children only, via `GuardianLink`).
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
- `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:security`: ~50 end-to-end security checks, including **guardian IDOR isolation**
  (guardian A vs B across students, payments, attendance, receipts, plus every mutation and admin endpoint) (local only; it refuses a non-localhost URL).
  It creates and deletes a temporary instructor. Run it after touching auth/access/API code.
- There are no unit tests yet.

## 4b. Branches & guardian portal
- Real branches: **Uttara, Bashundhara, Aftab Nagar, Gulshan** (they exist in the local DB; in production an admin creates them under Branches).
- Renaming a branch also updates notices whose `audience` is the old name (notices target branches by name).
- **Guardian portal:** the admin creates a guardian on the Guardians page (login email + temporary password) and links children
  (Father / Mother / Guardian). The guardian signs in at /login and sees "My Children": per child, today's status
  (in class / absent / not marked yet / no class), this month's attendance, next class, and the outstanding balance.
  `/dashboard/children/[id]` has tabs for Attendance (12 weeks), Balance (month by month), Receipts and Classes. Guardians can also see
  Fees (their children's receipts), Schedule and Notices (their children's branches) and Profile. Everything is read-only.
- `/api/my-children` deliberately omits NID / birth-registration numbers.
- Local sample guardians: `guardian1@local.test` (2 children), `guardian2@local.test` (2), `guardian3@local.test` (1); password `Guardian-pass-1`.
- Not built yet: online admission does NOT create a guardian account (it still creates a student login). The admin links guardians manually. → backlog

## 5. Design system (2026-11 redesign)
- **Client palette (required, 2026-11-14):** **Midnight Black `#030407`** (ink-950), **Electric Cobalt Blue `#1558C9`** (brand-600),
  **Acid Lime `#D4FF24`** (lime-400). The client's reference was a dark product site with a lime "Buy now" pill and cobalt accents.
  - Lime is a **fill** (CTA buttons, active-nav bar, highlights, "featured" items) **with ink-950 text**, or lime text on DARK backgrounds only.
    Lime text on white is unreadable. Lime avatars use dark initials.
  - Cobalt = links, eyebrows, charts, focus ring, light-mode accents. `gold-*` = functional **warning** only (fees due, Caps Lock, low attendance).
  - Program colours: Beginner = cobalt, Intermediate = lime, Advanced = ink/slate.
- **Logo:** the official round badge ("Bangladesh Online Skating School", two inline skaters) belongs at **`public/logo.png`**.
  `LogoMark` (Brand.js) renders it in a white circle; if the file is missing it falls back to the drawn SVG mark (`DrawnMark`).
  favicon.svg / icon-*.png / favicon.ico are currently generated from the drawn mark in the client colours. Regenerate them from logo.png once it's added.
- The signature visual is the "rink lines" SVG (concentric track lanes plus a gliding light streak). No emoji logos.
- **Tokens** (tailwind.config.js): `brand-50…950` (cobalt), `ink-50…950` (midnight), `lime-50…900`, `gold-200…600`. **`slate-*` is aliased to `ink`**, and `teal`/`navy`/`amber`
  are legacy aliases (→ brand-600 / ink-950 / gold-400), so old class names still render on-palette. Prefer the new names in new code.
- **Type:** Inter for UI (`font-sans`), **Sora** for headings and big numbers (`font-display`). Headings are semibold with tight tracking.
  Use `tabular` for numbers. ৳ falls back to a system glyph (Sora/Inter lack it); that's expected.
- **Surfaces:** pages sit on `bg-ink-50` (dark: `ink-950`); cards = `cx.card` (white, hairline shadow; dark: ink-900/70 + white/7 ring).
  Primary button = ink-950 (dark: white) via `cx.btnPrimary`; the brand-coloured CTA = `cx.btnBrand`; destructive = `cx.btnDanger`.
- **Page skeleton:** every dashboard page starts with `<PageHeader title subtitle actions />`, then cards. Lists use
  `divide-ink-100 dark:divide-white/[0.05]`. Destructive actions always go through `ConfirmDialog` with a specific message.
- **Dark mode:** always pair light classes with `dark:` variants; translucent tints (`bg-red-500/[0.07]`) work in both themes.
- **Motion:** `animate-rise` (hero), `animate-glide` (rink streak), `animate-scaleIn` (dialogs). Respect reduced motion (globals.css does).
- Utilities in globals.css: `.grain` (noise overlay), `.hairline-grid`, `.tabular`, `.text-balance`; global `:focus-visible` ring.
- Screenshots: a headless Chrome DevTools-protocol script was used during the redesign (kept outside the repo). Use real browser checks for UI changes.

## 6. Conventions
- JavaScript only, App Router, `"use client"` pages under dashboard fetch through `src/lib/api.js`.
- New DB changes: edit `schema.prisma`, then `npx prisma migrate dev --name <name>` locally (creates the migration folder; commit it).
  Prod uses `prisma migrate deploy` only. Never `migrate reset` against prod.
- Dark mode: always pair light classes with `dark:` variants (recent commits did a dark-mode pass).
- Commit style: conventional commits (`feat:`, `fix:`, …).

## 7. Known issues / gotchas
- `DEPLOY.md` references `DEPLOY-CLOUDFLARE.md`, which doesn't exist.
- Commits 60da055/3a259c2 say Analytics/SpeedInsights were added, but `src/app/layout.js` doesn't render them.
- `rate-limit.js` is in-memory, so on Vercel serverless each instance has its own counters (weak protection).
- Student `photo` is stored as a base64 data URL in Postgres (fine for small use, bloats the DB at scale).
- Locally there's no proxy IP header, so `clientIp()` returns `local` or `::1`, and all local logins share one per-IP bucket (20 per 15 min).
- Local DB currently holds **sample data** (3 branches, 3 coaches `coach1-3@local.test` / `Coach-pass-1`, 16 students
  `student1-16@local.test` / `Student-pass-1`, payments, notices, schedule). It was seeded through the API from a scratchpad script, not
  committed. Wipe it with `localdb.py reset` + setup + migrate + bootstrap-admin.
- `npm audit`: several dev-tooling advisories (brace-expansion, js-yaml, effect, deepmerge-ts). Mostly transitive via eslint/prisma.

## 7b. Git workflow & restore points
- Remotes:
  - `origin` = `github.com/nagaxor/skating-school` (**owner's own repo, kept PRIVATE**). Push here.
  - `upstream` = `github.com/ShahriyarH10/skating-school` (original, read-only for us; `git fetch upstream` to get its updates).
- The original repo's Vercel project auto-deploys *its* `main` to production. Do the work on a branch and merge only when it's verified.
- Working branch: `local-dev-setup`.
- Before each bigger change, create an annotated tag `checkpoint-YYYY-MM-DD-<topic>` so the owner can roll back:
  - see the code at that point: `git checkout <tag>`
  - undo everything after it on the current branch: `git reset --hard <tag>` (destructive, so confirm first)
- Tags so far: `checkpoint-2026-11-14-local-setup` (local env + this file), `checkpoint-2026-11-14-before-redesign` (before redesign branch).
- Branch `redesign`: phase 1 security, phase 2 design + features. Not merged to `main` yet.
- `nagaxor` has no write access to `upstream` (403 on 2026-11-14), which is why the owner's own repo is `origin`.
- Push: `git push -u origin main local-dev-setup --follow-tags`.

## 8. Upgrade backlog (prioritized — pick from the top; move to Changelog when done)
0. **Merge `redesign` → `main`** after the owner reviews it locally (`main` deploys to Vercel); run `prisma migrate deploy` on prod first.
0. Admission → create/link a guardian account automatically (and "enroll another child" from the guardian portal).
0. Guardian notifications (SMS/WhatsApp when a child is marked absent or a fee is due).
0. Nonce-based CSP (drop script `'unsafe-inline'`); persistent (DB) per-IP rate limiting.
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
- **2026-11-14** — Public site split into separate pages per the owner: `/` (home), `/programs`, `/why-us`, `/branches` (live DB), `/faq`.
  All are dark, matching the home hero (midnight bg, lime CTAs/accents, cobalt highlights; no white sections). Shared SiteShell (nav with active
  state + mobile menu, footer, mobile CTA, page hero, CTA band). Copy centralised in lib/site-content.js. Branches page has Google Maps links.
  Server page files export metadata (Icon is a client-module object, so pages render client content components).
- **2026-11-14** — **Client palette applied:** Midnight Black / Electric Cobalt / Acid Lime. Token scales rewritten (brand = cobalt, ink = midnight,
  new lime). Hard-coded hex and rgba glows swept. Lime CTAs (landing, admission submit, btnBrand), lime hero headline, lime active-nav bar,
  lime ring gradients. Program tones changed. Favicon/PWA icons redrawn in the new colours (rendered via headless Chrome; ico built by hand).
  manifest theme/background → #030407. LogoMark now prefers `/logo.png` (official badge, owner to add) with SVG fallback. Files: tailwind.config.js,
  globals.css, layout.js, Brand.js, ui.js, DashboardShell.js, most pages, public/{favicon.svg,favicon.ico,icon-*.png,manifest.json}.
- **2026-11-14** — **Guardian portal + IDOR hardening.** Migration `guardian_portal` (Role.guardian, GuardianLink). New central authz in
  lib/access.js (`isStaff`, `isAdmin`, `studentScope`, `visibleClubIds`). Every API route was refactored from deny-lists to allow-lists and
  scoped reads (students, payments, receipts, attendance, schedules, notices, users/status); out-of-scope records → 404.
  New APIs: `/api/guardians` (admin CRUD + link/unlink, audited), `/api/my-children` (guardian). New pages: Guardians (admin),
  guardian home (child cards), children/[id]. UI role checks are allow-lists too. lib/fees.js for balance history.
  Branch rename now carries notices along. The security smoke test gained ~25 guardian isolation checks (all pass). Local data: branches renamed to
  Uttara / Bashundhara / Aftab Nagar / Gulshan, plus 3 sample guardians.
- **2026-11-14** — **UI polish round 3.** `/admission` rebuilt: dark brand rail with a clickable stepper and program summary, progress bar,
  per-step titles, choice chips (program, gender, shift, blood group, occupation type) instead of dropdowns, father/mother cards,
  a review summary on the last step (validation/submit logic unchanged; the form is always light-themed).
  **Reports** rebuilt: 3/6/12-month range, revenue trend with gridlines and tooltips, donuts by payment method and fee type,
  active students by branch/program. **Student detail** rebuilt: dark hero (photo, contact, admin Reset password / Deactivate),
  metrics (attendance ring, total paid, last payment, enrolled), tabs Profile / Payments / Attendance (12-week Sat→Fri grid).
  **Settings**: sectioned cards, live receipt-header preview, saves only changed keys (cleaner audit log), discard button.
  **Branches**: header + stats, rink-motif cards. Files: src/app/admission/page.js, src/app/dashboard/{reports,settings,branches}/page.js,
  src/app/dashboard/students/[id]/page.js.
- **2026-11-14** — **Redesign phase 2: premium design + features** (branch `redesign`). New design system (tokens, Sora, logo, rink motif),
  new landing (hero + product preview, programs, why-us, live branches, steps, FAQ), new login, new shell (sidebar, top bar,
  Ctrl+K palette, mobile tabs), new overview (revenue chart, fee ring, student "next class" view). Feature work:
  students (edit, deactivate/reactivate, filters, CSV export, confirm dialogs), staff (unified list, admin password reset with generator,
  deactivate, role change with confirm), notices (delete; API returns `mine`), schedule (weekly board, delete, branch filter),
  profile & security (strength meter, last sign-in, sign out everywhere), **Activity Log page**, fee tracker + payments CSV export,
  attendance (only active students, "mark rest present", dark-mode fix). Fixed the `<html>` hydration warning (suppressHydrationWarning).
  Verified: lint 0 errors, `npm run build` OK, security smoke 23/23, headless screenshots of all pages (light/dark/mobile).
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
