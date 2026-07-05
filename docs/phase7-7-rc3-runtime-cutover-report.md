# BoothBridge Phase 7.7 RC3 — Controlled Runtime Cutover Report

**Generated:** 2026-07-05  
**Repository:** `booth-bridge`  
**Branch:** `migration/base44-independence`  
**Canonical Supabase project:** `jjqhmvfzqpohvukoxeoe`  
**Runtime default (after RC3):** `VITE_DATA_BACKEND=supabase`

---

## Executive Summary

RC3 executed the controlled runtime cutover by changing the application default backend from Base44 to Supabase in a single configuration file. The backend abstraction layer (`authClient`, `dbClient`, `storageClient`, `aiClient`) remains intact; no schema, RLS, storage policy, Edge Function, or business-logic changes were made.

Production and development builds both compile successfully under the new default. The Base44 rollback path compiles when `VITE_DATA_BACKEND=base44` is set explicitly. Fresh live end-to-end smoke tests could not be re-run in this session because Supabase credentials are not available in the local shell and the Supabase MCP server returned a permission error.

Prior live validation from Phase 7.6 and RC2 provides strong confidence for auth, CRUD, storage signed URLs, meetings, connections, and realtime. The RC2 operational blocker — missing/invalid AI provider credentials on the canonical project — was **not resolved** in this session and remains the primary production risk for OCR and AI assistant flows.

---

## RC3 Decision

**Classification: GO WITH WARNINGS**

The runtime switch is structurally complete and rollback-capable. Proceed to production deployment only after:

1. Setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the target environment (mandatory — the new default requires them).
2. Fixing `OPENROUTER_API_KEY` and/or the direct OpenAI fallback key on the canonical Supabase project (required for OCR and AI chat).
3. Updating Vercel (or equivalent) environment so `VITE_DATA_BACKEND` is either unset or explicitly `supabase` — an existing `base44` override would negate this cutover.
4. Re-running authenticated AI/OCR smoke tests after secrets are corrected.

---

## 1. Runtime Modifications

### Files changed

| File | Change |
|------|--------|
| `src/config/backend.js` | Default backend `base44` → `supabase`; invalid-value fallback `base44` → `supabase` |

### Before

```javascript
const rawBackend = import.meta.env.VITE_DATA_BACKEND || "base44";
export const DATA_BACKEND = VALID_BACKENDS.includes(rawBackend) ? rawBackend : "base44";
```

### After

```javascript
const rawBackend = import.meta.env.VITE_DATA_BACKEND || "supabase";
export const DATA_BACKEND = VALID_BACKENDS.includes(rawBackend) ? rawBackend : "supabase";
```

### Unchanged (per constraints)

- Database schema / migrations
- RLS policies
- Storage policies
- Edge Function source
- AI Gateway routing logic
- React pages, hooks, routes, and business logic
- Abstraction module APIs

### Effective runtime behavior

| `VITE_DATA_BACKEND` | Result |
|---------------------|--------|
| Unset | **Supabase** (new default) |
| `supabase` | Supabase |
| `base44` | Base44 (emergency rollback) |
| Invalid value | **Supabase** (new fallback) |

### Required environment variables (Supabase default)

| Variable | Required when default active |
|----------|------------------------------|
| `VITE_SUPABASE_URL` | Yes — `getSupabaseClient()` throws if missing |
| `VITE_SUPABASE_ANON_KEY` | Yes — `getSupabaseClient()` throws if missing |
| `VITE_DATA_BACKEND` | Optional — only needed to force `base44` rollback |
| `VITE_AI_ENABLED` | Optional — `false` disables AI client calls |

Legacy Base44 variables (`VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`, etc.) are only needed when `VITE_DATA_BACKEND=base44`.

---

## 2. Abstraction Layer Resolution

All four client modules branch on `isBase44()` / `isSupabase()` from `src/config/backend.js`. With the RC3 default, every public export resolves to the Supabase implementation path unless `VITE_DATA_BACKEND=base44` is set.

### `authClient` (`src/api/authClient.js`)

| Export | Supabase path (active default) |
|--------|-------------------------------|
| `login` / `loginWithEmailPassword` | `supabaseAuth.supabaseLogin` |
| `logout` | `supabaseAuth.supabaseLogout` |
| `register` | `supabaseAuth.supabaseRegister` |
| `getCurrentUser` / `currentUser` | `supabaseAuth.supabaseGetCurrentUser` |
| `refresh` | `supabaseAuth.supabaseRefreshSession` |
| `onAuthStateChange` | `getSupabaseClient().auth.onAuthStateChange` |
| `getAccessToken` | Supabase session token |
| `verifyOtp` / `resendOtp` / `requestPasswordReset` | `supabaseAuth.*` |
| `adminLogin` | `supabaseAuth.supabaseAdminLogin` (Edge Function `admin-auth`) |
| `checkAppReady` | `supabaseAuth.supabaseCheckAppReady` |
| Role detection | JWT `app_metadata.role` + `public.user` join via `mergeAppUser()` |

**Consumer coverage:** `AuthContext.jsx`, `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `AdminLogin.jsx` — all import `@/api/authClient` only.

### `dbClient` (`src/utils/dbClient.js`)

| Export | Supabase path (active default) |
|--------|-------------------------------|
| `db.*` (39 entities) | `makeSupabaseEntity()` → `supabase.from(tableName)` |
| `db.*.subscribe()` | `supabaseEntity.js` multiplexed realtime channels |
| Typed helpers (`saveConnection`, `createMeetingRequest`, `sendNotification`, etc.) | Delegate to `db.*` Supabase entities |

**Consumer coverage:** 60+ pages/hooks import `db` from `@/utils/dbClient`. Zero pages import `base44.entities` directly.

### `storageClient` (`src/api/storageClient.js`)

| Export | Supabase path (active default) |
|--------|-------------------------------|
| `upload` / `uploadFile` | `supabaseStorage.supabaseUpload` |
| `getSignedUrl` | `supabaseStorage.supabaseCreateSignedUrl` |
| `getPublicUrl` | Supabase public URL helper |
| `download`, `remove`, `list`, `exists`, `copy`, `move` | `supabaseStorage.*` |
| Bucket constants | `BUCKETS` from `storageBuckets.js` |

**Consumer coverage:** `assetPipeline.js`, `Onboarding.jsx`, `Products.jsx`, `DigitalBooth.jsx`, `OCRScanner.jsx`, admin media pages — all via `storageClient` or `assetPipeline`.

### `aiClient` (`src/api/aiClient.js` → `aiGateway.js` → `supabaseAi.js`)

| Export | Supabase path (active default) |
|--------|-------------------------------|
| `generate` / `chat` | Edge Functions `ai-generate`, `ai-chat` |
| `extractDocument` / `extractOcrScan` | Edge Function `ai-document` |
| `extractBusinessCard` / `extractBadge` | Dedicated Edge Functions |
| `health` | Edge Function `ai-health` |
| `summarize`, `classify`, `recommend`, `match` | Respective Edge Functions |

**Consumer coverage:** `OCRScanner.jsx`, `AiBoothAssistant.jsx`, admin OCR review — all via `@/api/aiClient`.

### Static verification summary

| Check | Result |
|-------|--------|
| Pages importing `base44Client` directly | **0** |
| Pages using foundation clients | **67+** |
| Mixed-runtime risk (both backends active simultaneously) | **None** — single `DATA_BACKEND` gate |
| `getSupabaseClient()` fail-fast without env | **Yes** — prevents silent Base44 fallback |

---

## 3. Base44 Dependency Inventory

Every `base44` / `@base44` occurrence in the repository, classified:

### Active dependency (required for rollback path)

| Location | Purpose |
|----------|---------|
| `src/config/backend.js` | `isBase44()` gate and `base44` valid backend value |
| `src/api/base44Client.js` | Base44 SDK singleton |
| `src/api/authClient.js` | Base44 auth branch + `createAxiosClient` import |
| `src/api/storageClient.js` | Base44 upload/signed-URL branch |
| `src/api/aiGateway.js` | Base44 LLM/document extraction branch |
| `src/utils/dbClient.js` | `makeBase44Entity()` proxy |
| `vite.config.js` | `@base44/vite-plugin` (build tooling) |
| `package.json` / `package-lock.json` | `@base44/sdk`, `@base44/vite-plugin` dependencies |
| `base44/functions/adminAuth/entry.ts` | Base44-hosted admin auth (rollback only) |
| `src/lib/app-params.js` | `base44_*` localStorage keys for Base44 token flow |

### Legacy compatibility (intentionally retained)

| Location | Purpose |
|----------|---------|
| `src/api/supabaseAuth.js` | Maps Supabase user → Base44-compatible app user shape |
| `src/utils/supabaseQuery.js` | Base44-style filter/sort → PostgREST translation |
| `src/ai/aiResponse.js` | Parses legacy Base44 extraction response shape |
| `src/ai/aiErrors.js` | Provider-specific error handling includes `base44` |
| `src/lib/AuthContext.jsx` | Comment referencing Base44 token-gated check |
| `public/sw.js` | Skips service-worker cache for `base44` hostnames |
| `supabase/functions/_shared/handler.ts` | Base44-compatible `status` + `output` fields in responses |
| `supabase/migrations/*` | `legacy_base44_id` columns (schema reference, unused in clean seed) |

### Documentation only

| Location | Notes |
|----------|-------|
| `docs/**` (40+ files) | Historical phase reports referencing `VITE_DATA_BACKEND=base44` |
| `base44/entities/*.jsonc` (39 files) | Entity schema reference for RLS translation |
| `base44/.app.jsonc`, `base44/config.jsonc` | App metadata reference |
| `scripts/phase6/**` | Archived export pipeline (Data Migration Waiver) |
| `base44/functions/phase6Export/entry.ts` | Archived export function |

### Safe to remove later (post-rollback window)

| Location | Notes |
|----------|-------|
| `index.html` favicon URL | `media.base44.com` CDN logo |
| `src/components/AuthLayout.jsx` | CDN logo constant |
| `src/components/layout/AppLayout.jsx` | CDN logo constant |
| `src/components/layout/AdminLayout.jsx` | CDN logo constant |
| `src/pages/AdminLogin.jsx` | CDN logo constant |
| `src/pages/Onboarding.jsx` | CDN logo inline URL |
| `dist-supabase-check/` | Stale build artifact |
| `package.json` name `base44-app` | Cosmetic rename candidate |
| `@base44/sdk` + `@base44/vite-plugin` | Removable after rollback window closes and `isBase44()` branches deleted |
| `src/api/base44Client.js` | Removable with packages |
| `base44/functions/adminAuth/` | Removable after Base44 decommission |

### CDN asset note

Six UI locations still load the BoothBridge logo from `media.base44.com`. This is **not** a runtime data dependency — it is a static asset URL. Functionality is unaffected; migration to `/public/logo.png` or Supabase Storage is a cosmetic follow-up.

---

## 4. Smoke Test Results

### Evidence tiers

| Tier | Scope |
|------|-------|
| **RC3 session** | Static analysis, build verification, edge-function reachability probe |
| **RC2 (2026-07-04)** | Live fixes for buyer assets, OCR wiring, meetings, connections; AI blocked |
| **Phase 7.6 (2026-07-04)** | Live auth, CRUD, RLS, storage, realtime, abstraction compatibility |

Fresh live smoke using `scripts/phase7-6-e2e-validation.mjs` was **not executed** — requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, none of which are set in the RC3 shell. Supabase MCP returned `permission denied`.

### Authentication

| Test | RC3 | Prior live evidence | Status |
|------|-----|---------------------|--------|
| Login | Static — `authClient` → `supabaseAuth.supabaseLogin` | Phase 7.6 PASS | **PASS** (confidence: high) |
| Logout | Static — `supabaseAuth.supabaseLogout` | Phase 7.6 PASS | **PASS** |
| Refresh session | Static — `supabaseRefreshSession` | Phase 7.6 PASS | **PASS** |
| Role detection | Static — JWT claims + `mergeAppUser` | Phase 7.6 PASS (admin + owner) | **PASS** |
| Register | Not re-run | Phase 7.6 BLOCKED (email rate limit) | **WARN** |
| OAuth callback | Not re-run | Phase 7.6 partial (initiation only) | **WARN** |

### Database

| Test | RC3 | Prior live evidence | Status |
|------|-----|---------------------|--------|
| CRUD (representative entities) | Static — 39 entities via `makeSupabaseEntity` | Phase 7.6 PASS (user, company, booth, product, meeting, connection, notification) | **PASS** |
| Meetings | Static — `db.Meeting` + RC2 buyer dashboard fix | Phase 7.6 + RC2 PASS | **PASS** |
| Connections | Static — `db.Connection` + RC2 role fix | Phase 7.6 + RC2 PASS | **PASS** |
| Notifications | Static — `sendNotification` → `db.Notification.create` | Phase 7.6 PASS (self-recipient); cross-user path known limitation | **PASS** with known limitation |

### Storage

| Test | RC3 | Prior live evidence | Status |
|------|-----|---------------------|--------|
| Logo upload | Static — `assetPipeline` → `storageClient.upload` | Phase 7.6 PASS | **PASS** |
| Products | Static — `BUCKETS.MEDIA/products/` | Phase 7.6 PASS | **PASS** |
| Catalogs | Static — `BUCKETS.ASSETS` | Phase 7.6 PASS | **PASS** |
| OCR uploads | Static — `BUCKETS.OCR` | Phase 7.6 + RC2 PASS (upload + signed URL) | **PASS** |
| Signed URLs (buyer-visible) | Static — `DigitalBooth` signed URL resolution | RC2 live PASS after policy fix | **PASS** |

### Realtime

| Test | RC3 | Prior live evidence | Status |
|------|-----|---------------------|--------|
| Meetings | Static — `db.Meeting.subscribe` in `Meetings.jsx` | Phase 7.6 PASS | **PASS** |
| Connections | Static — `db.Connection.subscribe` in `Connections.jsx` | Phase 7.6 PASS | **PASS** |

### AI

| Test | RC3 | Prior live evidence | Status |
|------|-----|---------------------|--------|
| Gateway routing | Static — `aiGateway` → `supabaseAi` | RC2 deploy PASS | **PASS** (routing) |
| Health | Edge reachable — `ai-health` returns `401` without auth (expected) | RC2: health responds with routing metadata when authenticated | **PARTIAL** |
| OCR extraction | Static — `extractOcrScan` → signed URL → `ai-document` | RC2: upload+URL PASS; inference **FAIL** (401 invalid OpenAI key) | **FAIL** |
| Chat | Static — `chat` → `ai-chat` Edge Function | Phase 7.6 FAIL (provider auth); RC2 unchanged | **FAIL** |

### AI runtime blocker (unchanged from RC2)

On the canonical project at RC2:

- `OPENROUTER_API_KEY` — not configured; all OpenRouter routes disabled
- Direct OpenAI fallback — enabled but returns `401 Incorrect API key provided`
- OCR and AI assistant flows cannot complete end-to-end until resolved

---

## 5. Build Results

Executed in RC3 session on `migration/base44-independence`:

| Build | Command | Exit code | Notes |
|-------|---------|-----------|-------|
| Production (new default) | `npm run build` with `VITE_SUPABASE_URL` + placeholder anon key | **0** | Default backend is Supabase; `dist/` produced (5 artifacts) |
| Development | `npx vite build --mode development` | **0** | No runtime crash |
| Rollback | `VITE_DATA_BACKEND=base44 npm run build` (no Supabase env) | **0** | Base44 path still compiles |

### Build checks

| Check | Result |
|-------|--------|
| Runtime crashes during build | **None** |
| Unresolved imports | **None** |
| Missing env at build time | Supabase URL/key required for bundle analysis; placeholder values sufficient for compile |
| Broken routes | **None** — `App.jsx` route table unchanged; all page imports resolve |
| `@base44/vite-plugin` warning | `Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)` — informational only |

### Pre-existing tooling notes (not introduced by RC3)

| Tool | Result |
|------|--------|
| `npm run typecheck` | Exit 1 — pre-existing SDK/type mismatches in `authClient.js`, `storageClient.js`, etc. |
| `npm run lint` | Exit 1 — pre-existing lint findings |
| Vite production build | **Passes** — build gate used for cutover sign-off |

---

## 6. Regression Findings

| ID | Severity | Finding | Introduced by RC3? |
|----|----------|---------|-------------------|
| REG-01 | **High** | AI/OCR non-functional on canonical project until provider secrets fixed | No — carried from RC2 |
| REG-02 | **Medium** | Local dev without `VITE_SUPABASE_*` will throw on first Supabase client access | Yes — expected consequence of default switch |
| REG-03 | **Medium** | Vercel env override `VITE_DATA_BACKEND=base44` would prevent cutover taking effect | No — deployment config |
| REG-04 | **Low** | `@base44/sdk` still bundled via unconditional imports in client layer | No — pre-existing |
| REG-05 | **Low** | Logo/favicon still served from `media.base44.com` CDN | No — cosmetic |
| REG-06 | **Low** | `base44_*` localStorage keys retained in `app-params.js` | No — rollback compatibility |
| REG-07 | **Info** | Public registration blocked by auth email rate limit (Phase 7.6) | No |
| REG-08 | **Info** | Notification cross-user create path limitation (Phase 7.6) | No |

No new regressions were introduced in application logic, routing, or abstraction APIs.

---

## 7. Rollback Assessment

### Rollback procedure

Revert **only** the runtime environment variable:

```
VITE_DATA_BACKEND=base44
```

No code revert is required — the Base44 branch remains fully wired in all four client modules.

### Rollback verification (RC3)

| Check | Result |
|-------|--------|
| `VITE_DATA_BACKEND=base44` build compiles | **PASS** (exit 0) |
| `isBase44()` returns true when env set | **PASS** (static) |
| `authClient` delegates to `base44.auth` | **PASS** (branch intact) |
| `dbClient` uses `makeBase44Entity` | **PASS** (branch intact) |
| `storageClient` uses `base44.integrations.Core` | **PASS** (branch intact) |
| `aiGateway` uses Base44 LLM integrations | **PASS** (branch intact) |
| Base44 packages still in `package.json` | **Yes** |
| `base44/functions/adminAuth` still present | **Yes** |
| Vercel instant rollback to prior deployment | **Available** (operational, not tested) |

### Rollback window recommendation

Keep `VITE_DATA_BACKEND=base44` as a documented emergency override for **48 hours** after production cutover, per Phase 7.7 plan. Base44 demo backend remains available on the `boothbridge-base44-final` tag.

**Rollback was not executed in RC3** (per instructions).

---

## 8. Production Readiness Recommendation

### Ready

- Runtime default switched to Supabase with minimal diff (1 file)
- Abstraction layer fully resolves to Supabase paths under new default
- Zero direct Base44 imports in pages/hooks
- Production and development builds pass
- Base44 emergency rollback compiles and remains env-gated
- Auth, CRUD, storage, meetings, connections, realtime validated live in prior phases
- RC2 integration fixes (buyer assets, OCR wiring, meeting dashboard, connection roles) in source

### Not ready without action

| Blocker | Action required |
|---------|-----------------|
| AI provider credentials | Set `OPENROUTER_API_KEY` on canonical project; fix or remove invalid OpenAI fallback key |
| Deployment env | Ensure `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on production; remove or update any `VITE_DATA_BACKEND=base44` override |
| Fresh live smoke | Re-run authenticated AI/OCR tests after secrets fix |
| OAuth / register | Browser-backed OAuth callback validation; monitor auth email rate limits |

### Deployment checklist (not executed in RC3)

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on production
- [ ] Set `VITE_DATA_BACKEND=supabase` or remove override (unset inherits new default)
- [ ] Fix AI gateway secrets on canonical Supabase project
- [ ] Re-run `scripts/phase7-6-e2e-validation.mjs` or manual smoke suite
- [ ] Deploy to preview first; validate login → booth → product → meeting → connection flows
- [ ] Keep `VITE_DATA_BACKEND=base44` documented for 48h emergency window

---

## Final Classification

# GO WITH WARNINGS

The controlled runtime cutover is **complete in source**. The application is structurally ready to run on Supabase by default. Production promotion should proceed only after AI provider credentials are corrected and deployment environment variables are confirmed — otherwise OCR and AI assistant features will fail at runtime despite a successful build.

---

*RC3 did not commit, tag, or deploy. Single modified file: `src/config/backend.js`.*
