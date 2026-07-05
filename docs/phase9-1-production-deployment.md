# Phase 9.1 — Production Deployment Verification

**Generated:** 2026-07-05  
**Repository:** `booth-bridge`  
**Canonical Supabase project:** `jjqhmvfzqpohvukoxeoe`  
**Target production domain:** `https://boothbridge.app`  
**Runtime default:** `VITE_DATA_BACKEND=supabase` (Phase 7.7 RC3)

---

## Executive Summary

Supabase production infrastructure is **live and aligned with the repository**: 10 Edge Functions ACTIVE, migrations applied, RLS/storage/realtime configured per Phase 7.8B. **Production deployment is not complete** — the frontend host (`boothbridge.app`) did not respond in this session, client `VITE_*` variables are unverified on the host, AI Edge secrets remain incomplete, and Auth SMTP/OAuth production settings require operator action in the Supabase Dashboard.

### Classification: **GO WITH WARNINGS**

Proceed with deployment execution after completing P0 operator tasks below. Do not declare production live until client env, Auth redirects, and (if AI is in pilot scope) provider secrets are set.

---

## 1. Supabase Production Verification

### Database

| Check | Status | Evidence |
|-------|--------|----------|
| Migrations applied (47) | ✅ PASS | Phase 7.8B: `supabase db push --linked --dry-run` → remote up to date |
| Public tables | ✅ 39 | Live SQL (Phase 7.8B) |
| RLS enabled | ✅ 39/39 | Phase 7.8B |
| RLS policies | ✅ 94 | `092_enable_rls.sql` |
| Constraints / indexes | ✅ Applied | `091_constraints.sql`, `090_indexes.sql` |
| Pending migrations | ✅ None | Phase 7.8B |

### Storage

| Check | Status | Evidence |
|-------|--------|----------|
| `boothbridge-media` (private) | ✅ | Phase 7.8B / 7.8E |
| `boothbridge-assets` (private) | ✅ | Phase 7.8B / 7.8E |
| `boothbridge-ocr` (private) | ✅ | Phase 7.8B / 7.8E |
| Storage policies | ✅ 16 | `094_storage_policies.sql` |
| Path conventions match client | ✅ | `src/config/storageBuckets.js` |

### Realtime

| Check | Status | Evidence |
|-------|--------|----------|
| Realtime enabled | ✅ | `supabase/config.toml`, `095_realtime.sql` |
| Published tables | ✅ `connection`, `meeting` | Phase 7.8F |
| Client subscription wiring | ✅ | `src/utils/supabaseEntity.js` |

### Edge Functions (live — this session)

CLI `supabase functions list --project-ref jjqhmvfzqpohvukoxeoe` (2026-07-05):

| Function | Status | Version | verify_jwt |
|----------|--------|---------|------------|
| `admin-auth` | ACTIVE | 2 | false |
| `ai-health` | ACTIVE | 2 | true |
| `ai-generate` | ACTIVE | 2 | true |
| `ai-chat` | ACTIVE | 2 | true |
| `ai-document` | ACTIVE | 2 | true |
| `ai-business-card` | ACTIVE | 2 | true |
| `ai-summary` | ACTIVE | 2 | true |
| `ai-classify` | ACTIVE | 2 | true |
| `ai-match` | ACTIVE | 2 | true |
| `ai-recommend` | ACTIVE | 2 | true |

**Result:** 10/10 ACTIVE — full parity with repository.

### Auth

| Check | Status | Notes |
|-------|--------|-------|
| Email/password enabled | ✅ | `enable_signup = true` |
| JWT expiry | ✅ 3600s | `config.toml` |
| Refresh token rotation | ✅ | Enabled |
| Admin role claim | ✅ | `app_metadata.role` (Phase 7.7A) |
| Production SMTP | ⚠️ UNVERIFIED | Dashboard operator task |
| Production redirect URLs | ⚠️ UNVERIFIED | Must include `https://boothbridge.app/**` |
| OAuth (Google, LinkedIn) | ⚠️ PARTIAL | Initiation works (7.6); prod callback not browser-tested |
| Auth health endpoint | ✅ Reachable | `GET /auth/v1/health` → HTTP 401 (expected without credentials) |

### REST API reachability

| Endpoint | Status |
|----------|--------|
| `https://jjqhmvfzqpohvukoxeoe.supabase.co/rest/v1/` | ✅ Reachable (HTTP 401 without key) |

---

## 2. Production Environment Variables

### Client host (Vercel or equivalent)

| Variable | Required | Code reference | Production status |
|----------|----------|----------------|-------------------|
| `VITE_SUPABASE_URL` | **Yes** | `src/api/supabaseClient.js` | ⚠️ **Not verified on host** |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `src/api/supabaseClient.js` | ⚠️ **Not verified on host** |
| `VITE_APP_URL` | Recommended | `src/api/supabaseAuth.js` | ⚠️ Should be `https://boothbridge.app` |
| `VITE_DATA_BACKEND` | Optional | `src/config/backend.js` | Omit or `supabase` (RC3 default) |
| `VITE_AI_ENABLED` | Optional | `src/config/backend.js` | Set `false` for staged AI cutover |
| `VITE_BASE44_*` | Rollback only | `src/lib/app-params.js` | ❌ Remove from production |

**Expected values:**

```
VITE_SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable anon key from Supabase Dashboard>
VITE_APP_URL=https://boothbridge.app
```

### Edge Function secrets (Supabase project)

| Secret | Required | Status (Phase 7.8A) |
|--------|----------|---------------------|
| `SUPABASE_URL` | Yes | ✅ Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | ✅ Auto-injected |
| `OPENROUTER_API_KEY` | **Yes** (AI primary) | ❌ **Absent** |
| `OPENAI_API_KEY` | Fallback | ⚠️ Present but **invalid** (401 in Phase 7.6) |
| `AI_PROVIDER` | Optional | Not set (defaults `openrouter`) |

**Note:** Supabase MCP tools returned permission errors this session — secret inventory relies on Phase 7.8A CLI audit. Re-verify after operator sets keys.

### Harness / CI (not client-exposed)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | E2E validation script |
| `SUPABASE_ANON_KEY` | E2E validation script |
| `SUPABASE_SERVICE_ROLE_KEY` | E2E validation script |

---

## 3. Production Redirect URLs

| URL pattern | Purpose | Status |
|-------------|---------|--------|
| `https://boothbridge.app/**` | OAuth, email confirm, password reset | ⚠️ **Must be added in Supabase Auth Dashboard** |
| `https://boothbridge.app/reset-password` | Password recovery | ⚠️ Verify after SMTP configured |
| Preview/staging URLs | Pre-prod smoke | Add before preview deploy |

Local `config.toml` still references `http://127.0.0.1:3000` — this affects local dev only; **production redirect allow-list is a Dashboard setting**, not repo-controlled.

Auth redirect construction: `{VITE_APP_URL || window.location.origin}{redirectPath}` (`src/api/supabaseAuth.js`).

---

## 4. Production Storage Buckets

Verified on canonical project (Phase 7.8B/7.8E):

| Bucket | Public | Max size (repo) | Policies |
|--------|--------|-----------------|----------|
| `boothbridge-media` | false | 50 MB | Owner + admin + shared read helpers |
| `boothbridge-assets` | false | 100 MB | Company/event scoped |
| `boothbridge-ocr` | false | 15 MB | Owner isolation |

**Classification:** ✅ PASS — no bucket changes required for launch.

---

## 5. Production RLS

| Check | Result |
|-------|--------|
| All public tables RLS ON | 39/39 ✅ |
| Anonymous writes blocked | ✅ |
| Owner/participant scoping | ✅ |
| Admin via `private.is_admin()` | ✅ |
| Storage RLS (16 policies) | ✅ |
| `user_metadata` not used for admin | ✅ (Phase 7.7A) |

**Known defect (non-blocking for deploy):** Cross-user `Notification.create` via `sendNotification()` may fail SELECT-after-INSERT due to recipient-only read policy (Phase 7.6).

---

## 6. Production AI Gateway

| Check | Code | Live |
|-------|------|------|
| Gateway implementation | ✅ `aiGateway.ts` | — |
| OpenRouter-first routing | ✅ | ❌ Key missing |
| Failover chain | ✅ | Not live-tested |
| JWT on AI functions | ✅ | ✅ |
| `ai-health` endpoint | ✅ | ⚠️ Degraded (Phase 7.6) |
| Direct OpenAI fallback | ✅ Last resort | ❌ Invalid key |

**AI production readiness:** ❌ **BLOCKED** until `OPENROUTER_API_KEY` set and `OPENAI_API_KEY` rotated.

Set `VITE_AI_ENABLED=false` on production host if pilot excludes AI features.

---

## 7. Frontend Host Status

| Check | Result |
|-------|--------|
| `https://boothbridge.app` HTTP response | ❌ **No response (000)** this session |
| Production build | ✅ `npm run build` exit 0 |
| Bundle | 1.64 MB JS + 88 KB CSS |
| Base44 rollback build | ✅ exit 0 |

**Interpretation:** Supabase backend is ready; **frontend production deployment is not confirmed live**.

---

## 8. Blocking vs Warning Items

### Blocking (before accepting production traffic)

1. Configure client host env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
2. Deploy frontend to production domain
3. Configure Auth redirect URLs + SMTP for email flows

### Warning (before full feature parity)

4. Set `OPENROUTER_API_KEY` + valid `OPENAI_API_KEY` for AI
5. Browser-test OAuth callbacks on production URL
6. Tune Auth email rate limits for exhibition signup volume
7. Confirm Supabase backup/PITR on plan

### Not blocking core CRUD pilot

- Cross-user notification defect (medium)
- CORS `*` on Edge Functions (low)
- 1.6 MB bundle size (low)

---

## Review

Phase 9.1 confirms **backend production readiness** inherited from Phase 7.8 and re-validates Edge Functions live. **Deployment gap** is operational: frontend host, client secrets, Auth production config, and AI provider keys.

---

## Prompt for Next Phase

**Phase 9.2 — Production Smoke Tests**

Execute full browser validation on the production (or preview) URL after P0 env configuration. Map each user journey — visitor, auth, exhibitor, buyer, admin, AI, realtime, storage — to pass/fail with evidence.

---

## Commands Before Phase 9.2

```powershell
# 1. Set Edge AI secrets (operator — use real keys)
supabase secrets set OPENROUTER_API_KEY=or-... OPENAI_API_KEY=sk-... --project-ref jjqhmvfzqpohvukoxeoe

# 2. Configure Vercel/host production env (Dashboard)
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_URL

# 3. Deploy preview/production frontend
npm run build
# vercel deploy --prod  (or host equivalent)

# 4. Run automated harness (requires service role in shell)
$env:SUPABASE_URL="https://jjqhmvfzqpohvukoxeoe.supabase.co"
$env:SUPABASE_ANON_KEY="<anon>"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role>"
node scripts/phase7-6-e2e-validation.mjs

# 5. Browser smoke per phase9-2-production-smoke-tests.md
```

---

## Classification

| Area | Status |
|------|--------|
| Supabase infrastructure | ✅ GO |
| Edge Functions | ✅ GO |
| Client deployment | ⚠️ NOT VERIFIED |
| Auth production config | ⚠️ WARNINGS |
| AI Gateway credentials | ❌ NOT READY |
| **Overall Phase 9.1** | **GO WITH WARNINGS** |
