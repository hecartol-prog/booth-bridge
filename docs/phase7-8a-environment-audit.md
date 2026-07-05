# Phase 7.8A — Production Environment Audit

**Generated:** 2026-07-05  
**Repository:** `booth-bridge`  
**Canonical Supabase project:** `jjqhmvfzqpohvukoxeoe`  
**Runtime default (RC3):** `VITE_DATA_BACKEND=supabase`

## Executive Summary

Repository code is correctly wired for Supabase-first production. The local shell and deployment host still lack the required client environment variables. Edge Function secrets exist on the canonical project but **OpenRouter is not configured** and the stored **OpenAI key was invalid at last live test** (Phase 7.6). No `JWT_SECRET` is used by this codebase — Supabase Auth manages JWT signing.

## Client Environment Variables

| Variable | Required for production | In repo code | Local shell (this session) | Assessment |
|----------|----------------------|--------------|---------------------------|------------|
| `VITE_DATA_BACKEND` | Optional (defaults `supabase`) | `src/config/backend.js` | SET (value not inspected) | OK if unset or `supabase` |
| `VITE_SUPABASE_URL` | **Yes** | `src/api/supabaseClient.js` | **NOT SET** | **Missing on deploy host** |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `src/api/supabaseClient.js` | **NOT SET** | **Missing on deploy host** |
| `VITE_AI_ENABLED` | Optional | `src/config/backend.js` | Not set | OK — defaults enabled |
| `VITE_APP_URL` | Recommended | `src/api/supabaseAuth.js` | Not set | Falls back to `window.location.origin` |
| `VITE_BASE44_APP_ID` | Rollback only | `src/lib/app-params.js` | Not required | Obsolete for production |
| `VITE_BASE44_APP_BASE_URL` | Rollback only | `src/lib/app-params.js` | Not required | Obsolete for production |
| `VITE_BASE44_FUNCTIONS_VERSION` | Rollback only | `src/lib/app-params.js` | Not required | Obsolete for production |

### Missing variables (production blocker)

1. **`VITE_SUPABASE_URL`** — `getSupabaseClient()` throws without it; app cannot start on Supabase path.
2. **`VITE_SUPABASE_ANON_KEY`** — same fail-fast behavior.

### Duplicated / overlapping variables

| Pair | Notes |
|------|-------|
| `VITE_SUPABASE_*` (client) vs `SUPABASE_URL` / `SUPABASE_ANON_KEY` (Edge auto-inject) | Intentional split — client uses `VITE_` prefix; Edge runtime receives auto-injected secrets. Not a defect. |
| `SUPABASE_SERVICE_ROLE_KEY` in Edge secrets list | Auto-injected by Supabase hosted runtime; also listed in project secrets. Expected. |

### Obsolete Base44 variables

Still referenced only on the rollback path:

| Variable | Location | Production action |
|----------|----------|-------------------|
| `VITE_BASE44_APP_ID` | `src/lib/app-params.js` | Remove from production Vercel env after cutover window |
| `VITE_BASE44_APP_BASE_URL` | `src/lib/app-params.js`, `vite.config.js` | Same |
| `VITE_BASE44_FUNCTIONS_VERSION` | `src/lib/app-params.js` | Same |
| `BASE44_LEGACY_SDK_IMPORTS` | `vite.config.js` build-time | Not needed in production |
| `BASE44_APP_ID`, `BASE44_EXPORT_*` | `scripts/phase6/**` only | Archived migration tooling — not production |

### Incorrect project references

| Check | Result |
|-------|--------|
| `supabase/.temp/project-ref` | `jjqhmvfzqpohvukoxeoe` ✅ |
| `scripts/phase7-6-e2e-validation.mjs` default | `jjqhmvfzqpohvukoxeoe` ✅ |
| `scripts/phase7-4f/deploy-all-functions.mjs` | Canonical project (Phase 7.7A) ✅ |
| Stale non-canonical refs in active code | **None found** |
| `README.md` | Still documents Base44-only setup — **documentation drift** |

### JWT_SECRET

**Not applicable.** No `JWT_SECRET` references exist in the repository. JWT validation uses Supabase Auth (`auth.getUser(token)`) with platform-managed signing keys (`SUPABASE_JWKS` auto-injected on Edge).

## Edge Function Secrets (canonical project)

Verified via `supabase secrets list --project-ref jjqhmvfzqpohvukoxeoe`:

| Secret | Present | Required | Notes |
|--------|---------|----------|-------|
| `SUPABASE_URL` | ✅ Auto-injected | Yes | Hosted runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Auto-injected | Yes | JWT validation in `_shared/auth.ts` |
| `OPENROUTER_API_KEY` | ❌ **Absent** | **Yes** (OpenRouter-first routing) | Primary AI gateway blocked |
| `OPENAI_API_KEY` | ✅ Present | Optional fallback | Phase 7.6: **invalid key** (HTTP 401) |
| `AI_PROVIDER` | Not set | No | Defaults to `openrouter` |
| `AI_PROVIDER_ORDER` | Not set | No | Defaults to DeepSeek→Gemini chain |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Not set | No | Legacy env-credential admin mode unused |
| `JWT_SECRET` | N/A | N/A | Not used |

## Recommended Cleanup

1. **Production Vercel (or host) env**
   ```bash
   VITE_DATA_BACKEND=supabase          # or omit (RC3 default)
   VITE_SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable anon key>
   VITE_APP_URL=https://boothbridge.app
   ```
2. **Edge secrets** (operator)
   ```bash
   supabase secrets set OPENROUTER_API_KEY=or-... --project-ref jjqhmvfzqpohvukoxeoe
   supabase secrets set OPENAI_API_KEY=sk-... --project-ref jjqhmvfzqpohvukoxeoe  # rotate invalid key
   supabase secrets set AI_PROVIDER=openrouter --project-ref jjqhmvfzqpohvukoxeoe
   ```
3. Remove obsolete `VITE_BASE44_*` from production host after 48h rollback window.
4. Add a tracked `.env.example` (optional hygiene) documenting required `VITE_*` vars — currently gitignored patterns only.
5. Update `README.md` to document Supabase-first local setup (documentation task, not runtime).

## Classification

| Category | Status |
|----------|--------|
| Code configuration | ✅ Correct |
| Production host env | ❌ Not verified / likely missing client keys |
| Edge AI secrets | ⚠️ Incomplete — OpenRouter missing, OpenAI invalid |
| Base44 cleanup | ⚠️ Obsolete vars remain for rollback only |
