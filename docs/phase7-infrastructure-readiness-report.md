# Phase 7.1 — Infrastructure Readiness Report

**Generated:** 2026-07-02  
**Milestone:** 7.1 — Provision Supabase production project  
**Canonical roadmap:** [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)  
**Repository:** `booth-bridge`  
**Strategy:** Schema-only migration — clean database, no Base44 data import  
**Runtime backend:** Base44 (unchanged until Phase 7.7)

---

## Final recommendation

### **READY WITH MINOR ACTIONS**

A Supabase project exists and has been locally linked, and all 43 schema migrations are present in the repository. Dashboard configuration (Auth providers, Storage buckets, secrets, redirect URLs) and CLI authentication were **not verified** in this investigation because the Supabase CLI is not logged in on this workstation and the Supabase MCP server returned permission errors.

**Complete the minor actions in §10 before starting Phase 7.2.** None of them require application code changes or migration execution.

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| Supabase project | **Partial** | Project `Booth Bridge App` (`jjqhmvfzqpohvukoxeoe`) linked locally via `supabase/.temp/` |
| Region | **Set — review** | `ap-northeast-1` (Tokyo) per pooler URL |
| Migrations in repo | **Complete** | 43 SQL files; extensions, 39 tables, indexes, FKs, triggers |
| Migrations applied remotely | **Unknown / likely no** | CLI not authenticated; no `config.toml`; project-state marks 7.2 not started |
| Auth providers | **Not verified** | Email, Google, LinkedIn required per roadmap |
| Storage buckets | **Not verified** | Three private buckets specified in roadmap |
| Edge Functions | **Not started** | No `supabase/functions/` directory |
| Environment variables | **Not configured** | No `.env.example`; Vercel vars not set |
| CLI workflow | **Partial** | `npx supabase@2.109.0` works; `supabase login` required |
| Security baseline | **Planned** | RLS deferred to 7.2 (`092_rls_policies.sql`); service role handling documented |
| Application code | **Unchanged** | Per Phase 7.1 constraints ✓ |

---

## 1. Supabase project

### 1.1 Existing project (local link artifacts)

Evidence in `supabase/.temp/` indicates a prior `supabase link`:

| Field | Value |
|-------|-------|
| **Project name** | Booth Bridge App |
| **Project ref** | `jjqhmvfzqpohvukoxeoe` |
| **Organization** | `flsmrphgbjxjxjlncwuk` |
| **Region** | `ap-northeast-1` (inferred from pooler host `aws-1-ap-northeast-1.pooler.supabase.com`) |
| **Postgres version** | 17.6.1.127 |
| **API URL (expected)** | `https://jjqhmvfzqpohvukoxeoe.supabase.co` |

> **Security note:** `supabase/.temp/` contains link metadata and pooler URLs. Add `supabase/.temp/` to `.gitignore` and ensure it is never committed. Project ref alone is low risk; database credentials must never enter the repo.

### 1.2 Region recommendation

| Option | Recommendation |
|--------|----------------|
| **Keep `ap-northeast-1`** | Acceptable if the team and primary early adopters are APAC-based, or if the project is already in active use. |
| **US trade-show audience** | Prefer `us-east-1` (N. Virginia) for lowest latency to US exhibitors/buyers and Vercel's default edge. |
| **EU-focused launch** | Prefer `eu-west-1` (Ireland) or `eu-central-1` (Frankfurt). |

**Region is immutable after project creation.** If the linked Tokyo project was created for experimentation only, create a separate **production** project in the target region before Phase 7.2 and re-link. Do not apply migrations to the wrong region project.

### 1.3 Organization and naming

| Environment | Suggested project name | Purpose |
|-------------|------------------------|---------|
| **Production** | `boothbridge-prod` | Vercel Production after 7.7 cutover |
| **Staging / Preview** | `boothbridge-staging` | Vercel Preview, Phase 7.4–7.6 E2E |
| **Local** | `supabase start` (Docker) | Optional offline dev; no cloud cost |

**Current state:** One cloud project (`Booth Bridge App`). For Phase 7.1 minimum, a single staging project is sufficient through 7.6. Add a dedicated production project before 7.7 cutover, or upgrade the existing project to Pro and treat it as production if region is correct.

### 1.4 Database sizing and pricing

| Tier | When to use | BoothBridge fit |
|------|-------------|-----------------|
| **Free** | Local `supabase start`, throwaway experiments | OK for personal CLI practice only |
| **Pro ($25/mo)** | Staging + production path | **Recommended** — no pause, daily backups, PITR add-on, higher Storage/Auth limits, production support |
| **Team** | Multiple engineers, SSO to dashboard | Consider at 7.7 if org has compliance needs |

**Compute (Pro):**

| Workload | Suggested size |
|----------|----------------|
| Phase 7.2–7.6 (empty → demo seed) | Micro (default) |
| Post-cutover (< 10k MAU, 39 tables) | Small |
| Live event spikes (realtime connections/meetings) | Monitor; scale to Medium if CPU > 70% sustained |

**Storage estimate (demo seed):** < 1 GB. **Pro** includes 100 GB — sufficient for launch.

---

## 2. Authentication planning

### 2.1 Required providers (from app + roadmap)

| Provider | App usage | Supabase dashboard action |
|----------|-----------|---------------------------|
| **Email / password** | Register, Login, OTP, password reset | Enable Email provider; confirm email ON for production |
| **Google OAuth** | `Login.jsx` → `auth.loginWithProvider("google")` | Enable Google; add OAuth client ID/secret |
| **LinkedIn OAuth** | `Login.jsx` → `auth.loginWithProvider("linkedin")` | Enable LinkedIn (custom OIDC); register BoothBridge redirect URIs |

### 2.2 Redirect URLs

Configure in **Supabase Dashboard → Authentication → URL Configuration**:

| URL type | Value |
|----------|-------|
| **Site URL** | Production canonical URL (e.g. `https://app.boothbridge.com` or current Vercel production domain) |
| **Redirect URLs** | `http://localhost:5173/**` |
| | `https://<vercel-preview-domain>/**` |
| | `https://<vercel-production-domain>/**` |

`supabaseClient.js` already sets `detectSessionInUrl: true` — OAuth callbacks must match these patterns.

`VITE_APP_URL` (roadmap) should equal the deployment origin used for OAuth return paths once `authClient` Supabase branch is implemented in 7.4.

### 2.3 Admin users

**Today (Base44):** `adminAuth` Edge Function compares credentials to `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars; session flag `bb_admin_authed` in `sessionStorage`.

**Target (Supabase):**

1. Create admin users via `supabase.auth.admin.createUser` (seed script, Phase 7.5) or dashboard.
2. Set `app_metadata.role = 'admin'` — **never** `user_metadata` for authorization (user-editable).
3. Replace `adminLogin` / `isAdminSession` with Supabase Auth + `app_metadata` checks in Phase 7.4.
4. Store bootstrap admin credentials in team vault only.

### 2.4 Session and JWT settings

| Setting | Recommendation | Rationale |
|---------|--------------|-----------|
| **JWT expiry** | Default 3600s (1h) | Balance security vs UX; refresh token handles continuity |
| **Refresh token rotation** | Enabled (default) | Standard Supabase Auth |
| **Refresh token reuse interval** | Default 10s | — |
| **Anonymous sign-ins** | Disabled | App requires registered roles |
| **Phone auth** | Disabled | Not used in app |
| **MFA** | Optional for admin accounts at 7.7 | — |

Client config in `supabaseClient.js` is already aligned: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`.

### 2.5 Auth schema gap (pre-7.4 awareness)

`public.user` is a separate application table with its own `id uuid`. Migrations do **not** FK to `auth.users`. Phase 7.4 must:

- Use `auth.users.id` === `public.user.id` on sign-up, or
- Add a sync trigger in a future migration.

This does **not** block Phase 7.2 (schema apply on empty DB) but must be designed before 7.5 seeding.

---

## 3. Storage planning

### 3.1 Required buckets (roadmap)

| Bucket | Visibility | Purpose | Code reference |
|--------|------------|---------|----------------|
| `boothbridge-assets` | **Private** | Event branding, company catalogs, signed downloads | `storageClient.js`, `assetPipeline.js` |
| `boothbridge-media` | **Private** | Admin media library uploads | `AdminMedia.jsx`, `media` table |
| `boothbridge-ocr` | **Private** | OCR / badge scan images before extraction | OCR flows, `aiClient` |

All buckets should be **private**. The app already routes display through signed URLs (`getSignedUrl`, 15-minute default in `assetPipeline.js`).

### 3.2 Path conventions (`assetPipeline.js`)

```
boothbridge-assets/
├── events/[event_id]/branding/
└── companies/[company_id]/catalogs/
```

Extend similarly for `boothbridge-media/` and `boothbridge-ocr/` when implementing `storageClient` in 7.4.

### 3.3 File limits

| Limit | Recommendation |
|-------|----------------|
| **Global upload limit** | 50 MB default (Free/Pro); increase in Dashboard → Storage → Settings if catalog PDFs exceed |
| **Image uploads** | 10 MB per file (typical photos) |
| **Catalog PDFs** | Up to 50 MB |
| **OCR images** | 5–10 MB |

### 3.4 CDN implications

| Bucket type | CDN behavior |
|-------------|--------------|
| **Public** | Supabase CDN serves objects directly |
| **Private (chosen)** | No public CDN URL; `createSignedUrl` via API — correct for tenant-isolated assets |

Configure **Storage CORS** to allow Vercel preview and production origins for browser uploads.

### 3.5 Storage RLS (Phase 7.2 / 7.4)

Bucket policies are not in SQL migrations. Author policies when implementing `storageClient` (7.4) or as part of `092_rls_policies.sql`. Minimum: authenticated users can upload to their tenant prefix; admins have broader read.

---

## 4. Extensions analysis

### 4.1 What migrations enable

`001_extensions.sql`:

```sql
create extension if not exists "pgcrypto";
```

All 39 entity tables use `gen_random_uuid()` (from `pgcrypto`), **not** `uuid-ossp`.

### 4.2 Extension requirement matrix

| Extension | Required? | In migrations? | Verdict |
|-----------|-----------|----------------|---------|
| **pgcrypto** | Yes | Yes (`001`) | Sufficient for UUIDs and crypto helpers |
| **uuid-ossp** | No | No | `gen_random_uuid()` replaces `uuid_generate_v4()` |
| **pgvector** | No | No | No vector columns or semantic search in schema/app |
| **pg_trgm** | No | No | Admin search loads entities client-side (`AdminGlobalSearch.jsx`) |
| **unaccent** | No | No | No accent-insensitive search requirement |
| **postgis** | No | No | No geo columns in current 39-table schema (`future-erd-v2.md` only) |
| **pg_cron** | No | No | No scheduled DB jobs in roadmap |
| **http / pg_net** | No | No | Edge Functions handle external HTTP (OpenAI, etc.) |

### 4.3 Platform features (not SQL extensions)

| Feature | Required? | When to enable |
|---------|-----------|----------------|
| **Realtime** | Yes | After 7.2 — `connection`, `meeting` tables (`Connections.jsx`, `Meetings.jsx` use `db.*.subscribe`) |
| **Edge Functions** | Yes (7.4) | Stubs in 7.1 optional: `admin-auth`, `ai-invoke`, `ai-extract-document` |
| **Database webhooks** | No | Not in current design |

**Correction to roadmap §7.2:** Verify `pgcrypto` only — not `uuid-ossp` — unless a future migration adds `uuid-ossp` functions.

---

## 5. Environment variables

The Vite app uses `VITE_*` prefixes. Map dashboard keys accordingly.

### 5.1 Client-side (safe for browser bundle)

| Variable | Local dev | Vercel Preview | Vercel Production | Notes |
|----------|-----------|----------------|-------------------|-------|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Staging project URL | Prod project URL | Same as `SUPABASE_URL` in non-Vite contexts |
| `VITE_SUPABASE_ANON_KEY` | Anon / publishable key | Staging anon key | Prod anon key | Public by design; RLS must protect data |
| `VITE_DATA_BACKEND` | `base44` or `supabase` | `supabase` | `base44` until 7.7 | **Keep `base44` on production until cutover** |
| `VITE_AI_ENABLED` | `true` / `false` | `false` until Edge Functions ready | `false` → `true` at cutover | Graceful degradation in `aiClient` |
| `VITE_APP_URL` | `http://localhost:5173` | `https://<preview>.vercel.app` | Production domain | OAuth redirect base (7.4+) |

### 5.2 Server-side / CI only (never `VITE_*`)

| Variable | Where | Purpose |
|----------|-------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Team vault, seed scripts, Edge Function env | Bypass RLS for admin seeding — **never in Vite** |
| `SUPABASE_ACCESS_TOKEN` | CI / developer machine | CLI automation (`supabase login` alternative) |
| `SUPABASE_DB_PASSWORD` | Team vault | Direct `psql` / migration emergencies |
| `OPENAI_API_KEY` | Supabase Edge Function secrets | `ai-invoke`, `ai-extract-document` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Supabase Edge Function secrets (transitional) | Legacy parity with `adminAuth` until 7.4 |

### 5.3 Base44 vars (retain until 7.7)

| Variable | Status |
|----------|--------|
| `VITE_BASE44_APP_ID` | Active — `app-params.js` |
| `VITE_BASE44_APP_BASE_URL` | Active |
| `VITE_BASE44_FUNCTIONS_VERSION` | Active |

### 5.4 Recommended `.env.local` template (create locally — do not commit)

```bash
# Supabase (staging project during Phase 7)
VITE_SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co
VITE_SUPABASE_ANON_KEY=<from-dashboard-settings-api>

# Backend switch — keep base44 until preview testing
VITE_DATA_BACKEND=base44
VITE_AI_ENABLED=false
VITE_APP_URL=http://localhost:5173

# Server-only (shell / scripts — NOT prefixed with VITE_)
# SUPABASE_SERVICE_ROLE_KEY=<team-vault>
```

---

## 6. CLI verification

| Check | Result | Action |
|-------|--------|--------|
| CLI available | **Pass** via `npx supabase@2.109.0` | Add as devDependency or install globally for faster runs |
| CLI logged in | **Fail** | Run `npx supabase login` |
| Project linked | **Partial** | `.temp/linked-project.json` exists; no `config.toml` |
| `supabase projects list` | **Fail** | Requires access token |
| `supabase db push` | **Not run** | Phase 7.2 only |
| Local stack (`supabase start`) | **Not configured** | Run `supabase init` to generate `config.toml` |

### 6.1 Recommended CLI workflow (best practices)

1. **Install:** `npm install -D supabase@2.109.0` (pin version in repo) or `scoop install supabase` on Windows.
2. **Login:** `npx supabase login` — store token in OS keychain.
3. **Init (if missing):** `npx supabase init` — creates `config.toml`; does not overwrite existing `migrations/`.
4. **Link:** `npx supabase link --project-ref jjqhmvfzqpohvukoxeoe` (confirm ref matches intended environment).
5. **Verify link:** `npx supabase projects list`
6. **Migration status (7.2):** `npx supabase migration list --linked`
7. **Apply (7.2 only):** `npx supabase db push`
8. **Never commit:** `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or `.env` files.

---

## 7. Security review

| Topic | Status | Guidance |
|-------|--------|----------|
| **Service role handling** | Documented | Server/CI/Edge Functions only; never `VITE_*` or client bundle |
| **Secret management** | Pending | Use team vault (1Password, Doppler, Vercel encrypted env for non-Vite secrets) |
| **Environment separation** | Pending | Staging vs production keys must not be shared on Vercel |
| **RLS preparation** | Schema only | 39 tables have **no RLS** in current migrations — **mandatory before preview with `VITE_DATA_BACKEND=supabase`** |
| **Auth metadata** | Planned | Use `app_metadata.role`, not `user_metadata`, for admin/tenant roles |
| **Storage policies** | Pending | Private buckets + signed URLs; policies in 7.2/7.4 |
| **Backup strategy** | Pending | Enable **PITR** on Pro before production cutover; test restore procedure |
| **`.gitignore` gap** | Action | Add `supabase/.temp/` |
| **MCP / CLI auth** | Action | Authenticate Supabase MCP or CLI for ongoing ops |

### 7.1 deployment readiness (infrastructure only)

| Gate | Ready? |
|------|--------|
| Project exists | Yes (verify dashboard access) |
| Auth providers configured | No — manual dashboard |
| Storage buckets created | No — manual dashboard |
| Secrets in vault | No |
| Vercel env vars set | No |
| Edge Function stubs | No (optional for 7.1) |
| Migrations applied | No — **Phase 7.2** |
| RLS applied | No — **Phase 7.2** |

---

## 8. Prerequisites before Phase 7.2

| # | Action | Owner | Blocks 7.2? |
|---|--------|-------|-------------|
| 1 | Confirm dashboard access to `jjqhmvfzqpohvukoxeoe` (or create correct-region project) | Infra | **Yes** |
| 2 | `npx supabase login` + `supabase link` on all dev machines | Dev | **Yes** |
| 3 | Run `supabase init` if `config.toml` missing | Dev | Recommended |
| 4 | Store `SUPABASE_SERVICE_ROLE_KEY` + anon key in team vault | Infra | **Yes** (for seed/verify) |
| 5 | Enable Email auth + confirm redirect URLs | Infra | No (but needed before 7.4) |
| 6 | Register Google + LinkedIn OAuth apps | Infra | No (but needed before 7.6) |
| 7 | Create 3 Storage buckets (private) + CORS | Infra | No (but needed before 7.5) |
| 8 | Add `supabase/.temp/` to `.gitignore` | Dev | Recommended |
| 9 | Decide staging vs production project split | Product | Recommended before prod cutover |
| 10 | Review region (`ap-northeast-1`) vs user geography | Product | **Yes** if wrong region |

**Phase 7.2 can proceed** once items **1, 2, 4** are complete and region is confirmed. Auth, Storage, and OAuth can finish in parallel with migration apply but must be done before 7.5 seed and 7.6 E2E.

---

## 9. Supabase environment checklist

Use this checklist to close Phase 7.1.

### Project

- [ ] Dashboard login verified for organization `flsmrphgbjxjxjlncwuk`
- [ ] Project ref documented in team vault (not repo): `jjqhmvfzqpohvukoxeoe`
- [ ] Region confirmed appropriate for launch audience
- [ ] Pro plan active (or plan to upgrade before 7.7)
- [ ] PITR backups scheduled (before production)

### CLI

- [ ] `npx supabase --version` ≥ 2.79.0 (current: 2.109.0)
- [ ] `npx supabase login` completed
- [ ] `npx supabase link --project-ref <ref>` succeeds
- [ ] `npx supabase migration list --linked` runs (expect empty or pre-7.2 state)
- [ ] `config.toml` present after `supabase init`

### Authentication

- [ ] Email provider enabled; SMTP configured (or Supabase default for staging)
- [ ] Email confirmation enabled for production path
- [ ] Google OAuth credentials set
- [ ] LinkedIn OIDC credentials set
- [ ] Site URL + redirect URLs include localhost, preview, production
- [ ] JWT settings reviewed (defaults acceptable)

### Storage

- [ ] `boothbridge-assets` bucket created (private)
- [ ] `boothbridge-media` bucket created (private)
- [ ] `boothbridge-ocr` bucket created (private)
- [ ] CORS allows Vercel origins
- [ ] Upload size limits reviewed (50 MB default)

### Secrets and env

- [ ] Anon key stored in Vercel Preview + local `.env.local`
- [ ] Service role key in vault only (not Vercel `VITE_*`)
- [ ] `VITE_DATA_BACKEND=base44` on Vercel Production (until 7.7)
- [ ] `VITE_DATA_BACKEND=supabase` on Vercel Preview (when 7.4 starts)
- [ ] `OPENAI_API_KEY` in Supabase Edge secrets (when AI functions deploy)

### Edge Functions (optional in 7.1; required by 7.4)

- [ ] `supabase/functions/admin-auth/` stub deployed
- [ ] `supabase/functions/ai-invoke/` stub deployed
- [ ] `supabase/functions/ai-extract-document/` stub deployed

### Repository hygiene

- [ ] `supabase/.temp/` gitignored
- [ ] No secrets in git history
- [ ] 43 migration files unchanged and ready for `db push`

---

## 10. Deployment checklist (Vercel + Supabase)

### Vercel project settings

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 20.x |

### Vercel environment matrix

| Variable | Development | Preview | Production |
|----------|-------------|---------|------------|
| `VITE_SUPABASE_URL` | Staging URL | Staging URL | Prod URL |
| `VITE_SUPABASE_ANON_KEY` | Staging anon | Staging anon | Prod anon |
| `VITE_DATA_BACKEND` | `base44` | `supabase` (from 7.4) | `base44` → `supabase` at 7.7 |
| `VITE_AI_ENABLED` | `false` | `false` | `false` until AI ready |
| `VITE_APP_URL` | `http://localhost:5173` | Preview URL | Production URL |
| `VITE_BASE44_*` | Keep | Keep | Keep until 7.7 |

### Post-migration (7.2+)

- [ ] Realtime enabled on `connection`, `meeting` tables
- [ ] `092_rls_policies.sql` applied before Supabase preview goes public
- [ ] `vercel.json` SPA rewrites + CSP for `*.supabase.co` (Phase 7.7)
- [ ] `public/sw.js` excludes `*.supabase.co` from cache (Phase 7.4)

### Cutover sequence (7.7 reference)

1. Production smoke on Preview + Supabase
2. Set `VITE_DATA_BACKEND=supabase` on Vercel Production
3. Deploy; run Phase 0 smoke suite
4. Monitor 24h; keep Base44 rollback for 48h

---

## 11. Risk assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Wrong AWS region (latency, compliance) | High | Medium | Confirm audience; create new project if needed **before** 7.2 |
| Dashboard config incomplete (Auth/Storage) | High | High | Complete §9 checklist; blocks 7.5/7.6 not 7.2 |
| RLS not applied before preview | Critical | Medium | `092_rls_policies.sql` in 7.2; gate preview deploys |
| Service role key exposed in Vite env | Critical | Low | Never use `VITE_` prefix; audit Vercel vars |
| `public.user` ≠ `auth.users` ID mismatch | High | Medium | Design sync in 7.4/7.5 seed script |
| OAuth redirect mismatch on Vercel preview | High | Medium | Wildcard preview URLs in Supabase Auth settings |
| CLI not authenticated on team machines | Medium | High | Document login + link in onboarding |
| Single project for staging + prod | Medium | Medium | Split before 7.7; acceptable for 7.2–7.6 |
| LinkedIn OAuth setup complexity | Medium | Medium | Allocate time in 7.1; test early in 7.6 |
| Edge Function cold start (OCR/AI) | Low | High | `VITE_AI_ENABLED=false` until stable |
| `supabase/.temp/` committed | Low | Medium | Add to `.gitignore` |
| Roadmap uuid-ossp verification typo | Low | Certain | Verify `pgcrypto` only in 7.2 |

---

## 12. Cross-check: work already completed

| Item | Source | Reuse in 7.1 |
|------|--------|--------------|
| 43 SQL migrations | `supabase/migrations/` | Ready for 7.2 `db push` |
| `ENTITY_TABLE_MAP` (39 entities) | `dbClient.js` | Table names align with migrations |
| `supabaseClient.js` singleton | Phase 1 | Auth session config ready |
| `backend.js` switch | Phase 1 | `VITE_DATA_BACKEND` pattern confirmed |
| Phase 7.3 audit | `phase7-base44-dependency-audit.md` | No duplicate audit needed |
| Phase 6 export tooling | `scripts/phase6/` | Archived — do not run |
| Local project link | `supabase/.temp/` | Re-link after `supabase login` |

---

## 13. Investigation limitations

The following could not be verified remotely during this report:

- Supabase Dashboard settings (Auth, Storage, billing tier, backups)
- Whether migrations were partially applied
- Bucket existence and CORS
- Edge Function deployment state

**Reason:** `npx supabase projects list` failed with `Access token not provided`; Supabase MCP returned `You do not have permission to perform this action`.

**Next step for assignee:** Run `npx supabase login`, open the dashboard for project `jjqhmvfzqpohvukoxeoe`, and tick §9 checklist items.

---

## Related documents

| Document | Role |
|----------|------|
| [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md) | Canonical Phase 7 roadmap |
| [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md) | Base44 inventory (7.3 complete) |
| [`project-state-june-2026.md`](./project-state-june-2026.md) | Project handoff status |
| [`migration-execution-roadmap.md`](./migration-execution-roadmap.md) | Vercel env blueprint |
| [`supabase/migrations/`](../supabase/migrations/) | Schema source of truth |

---

*Update this document when Phase 7.1 checklist (§9) is fully complete and mark milestone 7.1 done in `phase7-complete-supabase-transition.md`.*
