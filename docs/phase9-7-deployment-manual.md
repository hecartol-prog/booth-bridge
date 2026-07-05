# Phase 9.7 — Deployment Manual

**Generated:** 2026-07-05  
**Project:** BoothBridge (`booth-bridge`)  
**Canonical Supabase:** `jjqhmvfzqpohvukoxeoe`  
**Production URL:** `https://boothbridge.app`  
**Region:** ap-northeast-1

---

## Table of Contents

1. [Production Deployment Guide](#1-production-deployment-guide)
2. [Rollback Guide](#2-rollback-guide)
3. [Recovery Guide](#3-recovery-guide)
4. [Secrets Guide](#4-secrets-guide)
5. [Environment Guide](#5-environment-guide)
6. [Developer Onboarding](#6-developer-onboarding)

---

## 1. Production Deployment Guide

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI 2.79+ (`supabase --version`)
- Access to Supabase org (project `jjqhmvfzqpohvukoxeoe`)
- Vercel or equivalent host admin access
- Git checkout of `booth-bridge` on release branch/tag

### Deployment order

```
Edge secrets → Auth config → Client env → Build → Preview smoke → Production deploy → Post-verify
```

### Step 1 — Edge Function secrets

```powershell
supabase secrets set `
  OPENROUTER_API_KEY=or-... `
  OPENAI_API_KEY=sk-... `
  AI_PROVIDER=openrouter `
  --project-ref jjqhmvfzqpohvukoxeoe
```

Skip AI secrets if deploying with `VITE_AI_ENABLED=false`.

Verify:

```powershell
supabase functions list --project-ref jjqhmvfzqpohvukoxeoe
# Expect 10/10 ACTIVE
```

### Step 2 — Supabase Auth (Dashboard)

1. **Authentication → URL Configuration**
   - Site URL: `https://boothbridge.app`
   - Redirect URLs: `https://boothbridge.app/**`
   - Add preview URL if using Vercel preview deploys

2. **Authentication → Email**
   - Configure SMTP (SendGrid, Resend, AWS SES, etc.)
   - Send test email

3. **Authentication → Providers**
   - Google: production OAuth client with authorized redirect URI
   - LinkedIn: same

4. **Authentication → Rate Limits**
   - Increase `email_sent` for exhibition signup day if needed

5. **Admin user**
   - Create user in Dashboard → set **App Metadata** (not User Metadata):
     ```json
     { "role": "admin" }
     ```

### Step 3 — Client environment (Vercel)

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://jjqhmvfzqpohvukoxeoe.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | From Dashboard → Settings → API → anon/public key |
| `VITE_APP_URL` | `https://boothbridge.app` |
| `VITE_DATA_BACKEND` | Omit or `supabase` |
| `VITE_AI_ENABLED` | `true` or `false` |

**Remove from production:** all `VITE_BASE44_*` variables.

### Step 4 — Build and deploy

```powershell
cd booth-bridge
npm ci
npm run build
# Vercel: connect repo → set env → deploy
# vercel --prod
```

### Step 5 — Post-deploy verification

```powershell
$env:SUPABASE_URL="https://jjqhmvfzqpohvukoxeoe.supabase.co"
$env:SUPABASE_ANON_KEY="<anon>"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role>"
node scripts/phase7-6-e2e-validation.mjs
```

Browser checklist: `docs/phase9-2-production-smoke-tests.md`

### Step 6 — Database migrations (if repo updated)

```powershell
supabase link --project-ref jjqhmvfzqpohvukoxeoe
supabase db push --linked --dry-run   # verify pending
supabase db push --linked             # apply (only if migrations exist)
```

**Current state (Phase 9.1):** Remote up to date — 47 migrations applied.

### Step 7 — Edge Function deploy (if functions changed)

```powershell
supabase functions deploy admin-auth --project-ref jjqhmvfzqpohvukoxeoe
# Or deploy all via scripts/phase7-4f/deploy-all-functions.mjs
```

---

## 2. Rollback Guide

### Frontend instant rollback (preferred)

**Vercel:** Deployments → select previous successful deployment → Promote to Production.

**Time:** < 2 minutes.

### Emergency Base44 backend rollback

Use only within 48h post-cutover window while Base44 remains available.

1. Vercel env: set `VITE_DATA_BACKEND=base44`
2. Restore: `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`
3. Redeploy
4. Verify login against Base44

Build verification:

```powershell
$env:VITE_DATA_BACKEND="base44"
npm run build
```

**Does not revert:** Supabase data, storage objects, or Edge secrets — Supabase remains running for retry.

Detail: `docs/phase7-8j-rollback.md`

---

## 3. Recovery Guide

### Frontend broken (white screen, env error)

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Missing VITE_SUPABASE_URL" | Client env not set | Add env vars; redeploy |
| 404 on routes | SPA routing misconfigured | Host: all routes → `index.html` |
| Stale bundle | CDN cache | Purge cache; hard refresh |

### Auth failures

| Symptom | Fix |
|---------|-----|
| OAuth redirect mismatch | Add exact URL to Supabase Auth allow-list |
| No email received | Fix SMTP; check spam; verify rate limits |
| Invalid login | Reset password via Dashboard |

### AI failures

| Symptom | Fix |
|---------|-----|
| All AI returns error | Set `OPENROUTER_API_KEY`; rotate OpenAI key |
| Slow AI | Check OpenRouter status; set `VITE_AI_ENABLED=false` temporarily |

### Database recovery

1. Supabase Dashboard → Database → Backups
2. Point-in-Time Recovery (if on Pro plan)
3. Document RPO/RTO with operator

### Edge Function recovery

```powershell
supabase functions deploy <name> --project-ref jjqhmvfzqpohvukoxeoe
```

Check logs: Dashboard → Edge Functions → Logs

---

## 4. Secrets Guide

### Never expose in client (`VITE_*`)

| Secret | Where it belongs |
|--------|------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge runtime only (auto-injected) |
| `OPENROUTER_API_KEY` | Edge secrets |
| `OPENAI_API_KEY` | Edge secrets |
| Stripe secret key | Future webhook function only |

### Safe in client

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (RLS-protected) |
| `VITE_APP_URL` | OAuth redirect base |

### Setting Edge secrets

```powershell
supabase secrets set KEY=value --project-ref jjqhmvfzqpohvukoxeoe
supabase secrets list --project-ref jjqhmvfzqpohvukoxeoe   # names only, hashed
```

### Rotation procedure

1. Generate new key in provider dashboard (OpenRouter, OpenAI)
2. `supabase secrets set` with new value
3. Redeploy Edge Functions (optional — secrets picked up on next invoke)
4. Run `ai-health` with `{ "ping": true }`
5. Revoke old key at provider

### Local development secrets

Create `.env.local` (gitignored):

```env
VITE_SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co
VITE_SUPABASE_ANON_KEY=<anon>
VITE_APP_URL=http://localhost:5173
VITE_DATA_BACKEND=supabase
```

For E2E script only (never commit):

```env
SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co
SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service role>
```

---

## 5. Environment Guide

### Environment matrix

| Variable | Local | Preview | Production |
|----------|-------|---------|------------|
| `VITE_SUPABASE_URL` | Required | Required | Required |
| `VITE_SUPABASE_ANON_KEY` | Required | Required | Required |
| `VITE_APP_URL` | `http://localhost:5173` | Preview URL | `https://boothbridge.app` |
| `VITE_DATA_BACKEND` | Omit | Omit | Omit |
| `VITE_AI_ENABLED` | Optional | Optional | `true`/`false` |
| `VITE_BASE44_*` | Rollback testing only | Never | Never |
| `OPENROUTER_API_KEY` | N/A | Edge | Edge |
| `OPENAI_API_KEY` | N/A | Edge | Edge |

### Backend selection (`src/config/backend.js`)

| `VITE_DATA_BACKEND` | Active backend |
|---------------------|----------------|
| Unset | Supabase (RC3 default) |
| `supabase` | Supabase |
| `base44` | Base44 (rollback) |

### Supabase project reference

Always use **`jjqhmvfzqpohvukoxeoe`**. Verify link:

```powershell
Get-Content supabase\.temp\project-ref
```

---

## 6. Developer Onboarding

### First-time setup

```powershell
git clone <repo-url>
cd booth-bridge
npm install
```

Create `.env.local` (see Secrets Guide).

```powershell
npm run dev
# http://localhost:5173
```

### Key directories

| Path | Purpose |
|------|---------|
| `src/api/` | Supabase client adapters (`supabaseClient.js`, `supabaseAuth.js`, etc.) |
| `src/utils/dbClient.js` | Entity abstraction (Supabase/Base44 switch) |
| `src/utils/supabaseEntity.js` | PostgREST entity layer + realtime |
| `supabase/migrations/` | Database schema (47 files) |
| `supabase/functions/` | Edge Functions (10) |
| `scripts/phase7-6-e2e-validation.mjs` | Automated smoke harness |

### Common commands

```powershell
npm run dev          # Local dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check (jsconfig)

supabase login
supabase link --project-ref jjqhmvfzqpohvukoxeoe
supabase db push --linked --dry-run
supabase functions list --project-ref jjqhmvfzqpohvukoxeoe
```

### Architecture notes (do not change for launch)

- Single SPA — React + Vite + TanStack Query
- Auth: Supabase Auth via `authClient.js`
- Data: `dbClient.js` → Supabase PostgREST
- Storage: private buckets + signed URLs
- AI: Edge Functions + OpenRouter gateway
- Realtime: `connection`, `meeting` tables only

### Documentation index

| Phase | Document |
|-------|----------|
| 7.8 Production readiness | `phase7-8-production-readiness-report.md` |
| 9.1 Deployment verify | `phase9-1-production-deployment.md` |
| 9.2 Smoke tests | `phase9-2-production-smoke-tests.md` |
| 9.5 Pilot checklist | `phase9-5-pilot-readiness.md` |
| Rollback | `phase7-8j-rollback.md` |
| Production checklist | `phase7-8-production-checklist.md` |

### Updating README (recommended post-launch)

Replace Base44-only instructions in `README.md` with Supabase-first setup from this manual.

---

## Review

This manual consolidates operator procedures from Phases 7.8 and 9.1–9.6. Execute sequentially for first production deploy.

---

## Prompt for Next Phase

**Phase 9.8 — Launch Decision**

Synthesize all Phase 7–9 reports into executive assessment with GO / GO WITH WARNINGS / STOP classification and confidence estimates.

---

## Commands Before Phase 9.8

Complete or explicitly defer all P0 items from Phase 9.1, then produce final assessment.

---

## Classification

**GO WITH WARNINGS** — manual is complete; execution depends on operator completing deployment steps.
