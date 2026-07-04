# Phase 7.4F — Deployment Report

**Generated:** 2026-07-03  
**Scope:** Deploy and validate Supabase infrastructure without switching application runtime  
**Runtime default:** `VITE_DATA_BACKEND=base44` (unchanged)  
**Supabase project:** BoothBridge (`ebaquannrgbgjihbjfdc`, ap-northeast-1, ACTIVE_HEALTHY)  
**Prior phase:** [7.4E Edge Functions](./phase7-4e-edge-function-report.md)

---

## Final recommendation

### **READY WITH MINOR ACTIONS**

All 10 Edge Functions are deployed and **ACTIVE** on the BoothBridge Supabase project. Gateway JWT enforcement, CORS, and the standard response envelope were verified via live HTTP smoke tests. Application code was not modified; runtime remains Base44.

**Blockers before Phase 7.5 cutover testing:**

1. Set Edge Function secrets (`OPENAI_API_KEY` minimum; verify auto-injected `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`).
2. Push database migrations to remote (no `public` tables or storage buckets exist yet).
3. Create storage buckets (`boothbridge-assets`, `boothbridge-media`, `boothbridge-ocr`).
4. Configure Google + LinkedIn OAuth in Dashboard (manual).
5. Create a test user with valid JWT for authenticated AI smoke tests (`ai-generate`, `ai-chat`, `ai-document`).

---

## 1. Edge Function Deployment Report

### Deployment method

| Method | Result |
|--------|--------|
| Supabase CLI (`npx supabase functions deploy`) | **403** — local CLI not authenticated / insufficient privileges |
| Supabase MCP (`deploy_edge_function`) | **10/10 success** |

### Deployed functions

| Function | Status | Version | verify_jwt | Endpoint |
|----------|--------|---------|------------|----------|
| `admin-auth` | **ACTIVE** | 2 | false | `POST /functions/v1/admin-auth` |
| `ai-health` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-health` |
| `ai-generate` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-generate` |
| `ai-chat` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-chat` |
| `ai-document` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-document` |
| `ai-business-card` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-business-card` |
| `ai-summary` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-summary` |
| `ai-classify` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-classify` |
| `ai-match` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-match` |
| `ai-recommend` | **ACTIVE** | 1 | true | `POST /functions/v1/ai-recommend` |

**Project URL:** `https://ebaquannrgbgjihbjfdc.supabase.co`

### Deployment tooling added

| Script | Purpose |
|--------|---------|
| `scripts/phase7-4f/write-bundles.mjs` | Bundle functions + shared modules for MCP deploy |
| `scripts/phase7-4f/deploy-all-functions.mjs` | CLI deploy helper (requires `supabase login`) |
| `scripts/phase7-4f/bundle-edge-function.mjs` | Single-function bundle utility |
| `scripts/phase7-4f/payloads/*.json` | Smoke-test request bodies |

---

## 2. Secret Configuration Checklist

| Secret | Required | Status | Notes |
|--------|----------|--------|-------|
| `SUPABASE_URL` | Yes | **Auto-injected** | Hosted Edge Runtime provides this |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Unverified** | Auto-injected on hosted; required for `auth.getUser()` in functions |
| `OPENAI_API_KEY` | Yes (default provider) | **Not set** | Blocks live `ai-generate` / provider probe |
| `OPENROUTER_API_KEY` | If `AI_PROVIDER=openrouter` | **Not set** | Optional |
| `AI_PROVIDER` | Optional | **Not set** | Defaults to `openai` |
| `AI_MODEL` | Optional | **Not set** | Defaults to `gpt-4o` |
| `ADMIN_EMAIL` | Optional | **Not set** | Transitional admin-auth mode |
| `ADMIN_PASSWORD` | Optional | **Not set** | Transitional admin-auth mode |
| `OPENROUTER_HTTP_REFERER` | Optional | **Not set** | — |
| `OPENROUTER_APP_NAME` | Optional | **Not set** | — |

### Set secrets (operator action)

```bash
supabase login
supabase link --project-ref ebaquannrgbgjihbjfdc
supabase secrets set OPENAI_API_KEY=sk-... AI_PROVIDER=openai
# Optional:
supabase secrets set ADMIN_EMAIL=... ADMIN_PASSWORD=...
```

MCP has no `list_secrets` tool — secrets must be confirmed in Dashboard → Edge Functions → Secrets.

### Git safety audit

| Check | Result |
|-------|--------|
| `.env` / `.env.*` in `.gitignore` | ✅ |
| `.env` files in repository | **None found** |
| API keys in tracked source | **None** (only placeholder docs / `env(...)` refs) |
| Bundle artifacts contain secrets | **No** (source code only) |

---

## 3. Dashboard Configuration Checklist

| Setting | Expected | Verified | Notes |
|---------|----------|----------|-------|
| Project status | ACTIVE | ✅ | `ACTIVE_HEALTHY`, Postgres 17 |
| Authentication enabled | Yes | ✅ | Auth API responds |
| Email provider | Enabled | ⚠️ Manual | Confirm in Dashboard → Auth → Providers |
| Google OAuth | Configured | ⚠️ Manual | Credentials not in repo — operator must configure |
| LinkedIn OAuth | Configured | ⚠️ Manual | Use `linkedin_oidc` provider |
| Storage buckets | 3 buckets | ❌ | `storage.buckets` query returned **empty** |
| Realtime | Enabled | ✅ | Default for hosted projects |
| Edge Functions | Enabled | ✅ | 10 functions ACTIVE |
| API settings | Anon + publishable keys | ✅ | Retrieved via MCP |
| Database schema | 48 migrations locally | ❌ | **No `public` tables** on remote — migrations not pushed |
| RLS | Not enabled | ✅ | Per phase constraints |

### Required operator actions (Dashboard / CLI)

```bash
# Push schema
supabase db push

# Create buckets (or migration)
# boothbridge-assets, boothbridge-media, boothbridge-ocr
```

---

## 4. Smoke Test Results

Tests run against **live deployed functions** without changing `VITE_DATA_BACKEND`.

### 4.1 Gateway JWT validation

| Test | Function | Expected | Actual | Pass |
|------|----------|----------|--------|------|
| No `Authorization` header | `ai-health` | 401 | `401 UNAUTHORIZED_NO_AUTH_HEADER` | ✅ |
| No `Authorization` header | `ai-generate` | 401 | `401` | ✅ |
| Anon key as Bearer (no `sub`) | `ai-health` | 401 | `401` — `invalid claim: missing sub claim` | ✅ |
| Anon key as Bearer | `ai-generate` | 401 | `401` — `invalid claim: missing sub claim` | ✅ |

### 4.2 admin-auth (no JWT required)

| Test | HTTP | Envelope | Pass |
|------|------|----------|------|
| Empty email/password | 400 | `{ success: false, error: { code: "INVALID_REQUEST", message: "Email and password are required." } }` | ✅ |
| Invalid credentials | 401 | `{ success: false, error: { code: "AI_AUTHENTICATION", message: "Invalid login credentials" } }` | ✅ |

### 4.3 CORS

| Test | Result | Pass |
|------|--------|------|
| `OPTIONS /ai-health` | `204`, `Access-Control-Allow-Origin: *` | ✅ |

### 4.4 Provider routing (blocked)

| Test | Function | Status | Reason |
|------|----------|--------|--------|
| `ai-generate` with valid user JWT | `ai-generate` | **Not run** | No test user JWT available |
| `ai-health` `{ ping: true }` | `ai-health` | **Not run** | Requires authenticated user JWT |
| `ai-chat` | `ai-chat` | **Not run** | Requires JWT + `OPENAI_API_KEY` |
| `ai-document` | `ai-document` | **Not run** | Requires JWT + storage signed URL |

### 4.5 Error envelope shape

All responses observed include: `success`, `result`, `error`, `provider`, `model`, `latency`, `usage`, `metadata`. ✅

### 4.6 Latency (handler-level, from envelope)

| Call | latency (ms) |
|------|----------------|
| admin-auth empty creds | 1 |
| admin-auth bad creds | 285 |
| ai-health anon JWT | 65 |
| ai-generate anon JWT | 108 |

---

## 5. Runtime Verification Report

### 5.1 Backend switch (`src/config/backend.js`)

| Function | Behavior |
|----------|----------|
| `DATA_BACKEND` | Defaults to `base44` when `VITE_DATA_BACKEND` unset |
| `isBase44()` | `true` under default env |
| `isSupabase()` | `true` only when `VITE_DATA_BACKEND=supabase` |
| `isSupabaseConfigured()` | Independent check for `VITE_SUPABASE_URL` + anon key |

### 5.2 Client abstraction routing

| Module | Base44 branch | Supabase branch | Conflict |
|--------|---------------|-----------------|----------|
| `dbClient.js` | `base44.entities.*` | `makeSupabaseEntity()` | **None** |
| `authClient.js` | `base44.auth.*` | `supabaseAuth.js` | **None** |
| `storageClient.js` | `base44.integrations.Core.*` | `supabaseStorage.js` | **None** |
| `aiClient.js` | `InvokeLLM` / `ExtractDataFromUploadedFile` | `supabaseAi.js` → Edge Functions | **None** |

### 5.3 Build verification

| Build | Command | Result |
|-------|---------|--------|
| Default (Base44) | `npm run build` | ✅ Exit 0 |
| Supabase compile | `VITE_DATA_BACKEND=supabase npm run build` | ✅ Exit 0 |

**Runtime not switched** — production bundle still targets Base44 paths by default.

---

## 6. Deployment Audit

| Check | Result |
|-------|--------|
| Direct `@base44/sdk` imports outside abstraction | **Only** `base44Client.js`, `authClient.js` (axios helper) ✅ |
| Pages import `supabaseAi` / `supabaseAuth` / `supabaseStorage` directly | **None** ✅ |
| Pages use abstraction clients | `authClient`, `aiClient` only ✅ |
| Hooks import Base44 / Supabase internals | **None** ✅ |
| Prompt text in pages/components | **None** — prompts only in `src/ai/prompts/` via `aiClient` ✅ |
| Duplicated AI logic | **None** — single `aiClient` ✅ |
| Duplicated storage logic | **None** — single `storageClient` + `assetPipeline` ✅ |
| Duplicated auth logic | **None** — single `authClient` + `AuthContext` ✅ |
| Application pages modified in 7.4F | **No** ✅ |
| Base44 removed | **No** ✅ |
| RLS enabled | **No** ✅ |
| Data seeded | **No** ✅ |

---

## 7. Risk Assessment

| Risk | Severity | Status | Mitigation |
|------|----------|--------|------------|
| Edge Functions deployed without `OPENAI_API_KEY` | High | Open | Set secrets before AI testing |
| Remote DB has no schema | High | Open | `supabase db push` |
| Storage buckets missing | High | Open | Create buckets per `storageBuckets.js` |
| OAuth providers unconfigured | Medium | Open | Dashboard provider setup |
| CORS wildcard `*` | Medium | Accepted | Tighten before production |
| No authenticated AI smoke tests | Medium | Open | Create test user + set secrets |
| CLI deploy 403 | Low | Workaround | Use MCP or `supabase login` |
| `ai-recommend` schema uses match schema (7.4E bug) | Low | Known | Fix in 7.5 if dedicated endpoint used |

---

## 8. Constraints compliance

| Constraint | Status |
|------------|--------|
| Do not modify application pages | ✅ |
| Do not enable Supabase runtime | ✅ |
| Do not implement RLS | ✅ |
| Do not seed data | ✅ |
| Do not switch `VITE_DATA_BACKEND` | ✅ |
| Do not remove Base44 | ✅ |
| Deployment / validation only | ✅ |

---

## 9. Phase 7.5 entry checklist

- [ ] `supabase secrets set OPENAI_API_KEY=...`
- [ ] `supabase db push` (apply 48 migrations)
- [ ] Create storage buckets
- [ ] Configure Google + LinkedIn OAuth
- [ ] Create admin test user (`app_metadata.role = admin`)
- [ ] Authenticated smoke test: `ai-health`, `ai-generate`, `ai-document`
- [ ] Preview env: `VITE_DATA_BACKEND=supabase` (preview only — not production default)
- [ ] `supabase login` for team CLI deploy path

---

**Next:** Phase 7.5 — schema push, secrets, bucket setup, OAuth, and authenticated end-to-end Supabase preview testing.
