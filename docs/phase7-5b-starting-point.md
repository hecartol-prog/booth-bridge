# Phase 7.5B — Starting Point

**Generated:** 2026-07-03 (end-of-day checkpoint)  
**Prior milestone:** Phase 7.5A — Platform Activation & Security Foundation (audit only)  
**Canonical project:** `jjqhmvfzqpohvukoxeoe`  
**Branch:** `migration/base44-independence`  
**Runtime:** `VITE_DATA_BACKEND=base44` (do not change until 7.7)

---

## Current status

| Area | State |
|------|-------|
| Application code | Phases 7.4A–7.4D implemented locally; **not committed** |
| Edge Function source | In repo (uncommitted); **not deployed** to canonical project |
| Database schema | ✅ 43 migrations applied on `jjqhmvfzqpohvukoxeoe` |
| RLS | ❌ 0/39 tables protected |
| Storage | ❌ 0 buckets, 0 policies |
| Auth users | ❌ 0 users |
| Edge secrets | ⚠️ `OPENAI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` set |
| Production readiness (7.5A score) | **~22%** — **NOT READY** for cutover |

**7.5A verdict:** Platform audit complete. Activation work deferred to 7.5B.

---

## Completed work (through 7.5A)

### Code (local, uncommitted)

- ✅ `dbClient` → `makeSupabaseEntity` / `supabaseQuery` (39 entities)
- ✅ `authClient` → `supabaseAuth` (email, OAuth, OTP, admin via `app_metadata`)
- ✅ `storageClient` → `supabaseStorage` + `storageBuckets.js` + `assetPipeline`
- ✅ `aiClient` → `supabaseAi` + `src/ai/prompts/**`
- ✅ `AuthContext` Supabase session listener
- ✅ 10 Edge Functions + `_shared/` modules
- ✅ `supabase/config.toml` JWT gateway settings

### Platform (`jjqhmvfzqpohvukoxeoe`)

- ✅ Project ACTIVE_HEALTHY, Postgres 17.6.1.127, `ap-northeast-1`
- ✅ 39 public tables, extensions (`pgcrypto`, `uuid-ossp`, `pg_stat_statements`)
- ✅ Migrations 001–048, 090, 091 applied

### Build

- ✅ `npm run build` passes (Base44 default)
- ✅ `VITE_DATA_BACKEND=supabase npm run build` compiles

### Documentation

- Phase 7.4A–7.4F reports (untracked)
- This checkpoint set (7.5A repo status, roadmap, starting point)

---

## Known blockers

| # | Blocker | Impact |
|---|---------|--------|
| 1 | **Uncommitted repository** | No reproducible checkpoint tag; team cannot branch from known SHA |
| 2 | **Edge Functions on wrong project** | 7.4F deployed to `ebaquannrgbgjihbjfdc`; canonical `jjqhmvfzqpohvukoxeoe` returns 404 for `ai-health` |
| 3 | **No storage buckets** | Upload flows fail on Supabase path |
| 4 | **No RLS** | 39 tables exposed via anon REST key |
| 5 | **OAuth unconfigured** | Google/LinkedIn login fails on Supabase path |
| 6 | **No seed data / test users** | Cannot run authenticated E2E |
| 7 | **No realtime publication** | `Meeting` / `Connection` subscribe will not receive events |

---

## Required manual dashboard tasks (7.5B)

Perform on **https://supabase.com/dashboard/project/jjqhmvfzqpohvukoxeoe**:

1. **Authentication → Providers**
   - Enable Email; configure SMTP for production emails
   - Enable Google OAuth (client ID + secret)
   - Enable LinkedIn OIDC (`linkedin_oidc`)
2. **Authentication → URL Configuration**
   - Site URL: production/preview canonical URL
   - Redirect URLs: `http://localhost:5173/**`, Vercel preview `/**`, production `/**`
3. **Storage → Buckets** (or SQL migration)
   - Create `boothbridge-media`, `boothbridge-assets`, `boothbridge-ocr` (all private)
4. **Storage → Policies** — per 7.5A recommendations
5. **Database → Replication** — add `meeting`, `connection` to `supabase_realtime`
6. **Edge Functions → Secrets** — confirm `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
7. **Auth → Users** — create admin with `app_metadata.role = 'admin'`

---

## Priority order for tomorrow

| Order | Task | Owner |
|-------|------|-------|
| 1 | **Commit** Phase 7.4 + 7.5A docs (exclude deploy artifacts) | Dev |
| 2 | Tag `phase7-5a-complete` on clean commit | Dev |
| 3 | Confirm linked project: `supabase projects list` shows `jjqhmvfzqpohvukoxeoe` | Dev |
| 4 | Deploy Edge Functions to **canonical** ref | Dev |
| 5 | Create storage buckets (private) | Dev / Dashboard |
| 6 | Draft `092_rls_policies.sql` | Dev |
| 7 | Configure OAuth + redirect URLs | Dashboard |
| 8 | Smoke: `ai-health`, bucket upload, admin login | Dev |

---

## Exact first command tomorrow

```bash
cd "c:\Users\hecto\Documents\Top\Boothbridge\App code\booth-bridge"
git status
supabase projects list
```

**Then**, after reviewing uncommitted files:

```bash
# Verify canonical link before any deploy
supabase link --project-ref jjqhmvfzqpohvukoxeoe

# First activation action (after commit/tag):
supabase functions deploy admin-auth ai-generate ai-chat ai-document ai-business-card ai-summary ai-classify ai-match ai-recommend ai-health --project-ref jjqhmvfzqpohvukoxeoe
```

> **Do not** deploy to `ebaquannrgbgjihbjfdc`. That project is **not** the canonical target.

---

## Canonical vs non-canonical projects

| Ref | Name | Role |
|-----|------|------|
| **`jjqhmvfzqpohvukoxeoe`** | Booth Bridge App | **Canonical** — all future work |
| `ebaquannrgbgjihbjfdc` | (Phase 7.1C experiment) | **Deprecated for BoothBridge** — 7.4F functions deployed here by mistake; do not use unless explicitly instructed |

---

## References

- [Repository status](./phase7-5a-repository-status.md)
- [Remaining roadmap](./phase7-remaining-migration-roadmap.md)
- [Phase 7.4F deployment report](./phase7-4f-deployment-report.md) (note project drift)
- [Phase 7 complete transition](./phase7-complete-supabase-transition.md)
