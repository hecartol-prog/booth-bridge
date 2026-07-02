# Phase 7.3 — Remaining Base44 Dependency Audit

**Date:** 2026-07-01  
**Strategy:** Schema-only migration (data migration waived)  
**Canonical roadmap:** [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)

---

## Summary

| Metric | Value |
|--------|-------|
| Runtime files with Base44 coupling | **14** in `src/` |
| Pages importing `base44Client` directly | **0** |
| Archived export tooling files | **13** in `scripts/phase6/` + `phase6Export` |
| Package dependencies | `@base44/sdk`, `@base44/vite-plugin` |
| Schema reference (keep, not runtime) | `base44/entities/*.jsonc` (39 files) |

**Phase 2 mechanical refactor status:** Complete for pages/hooks/lib. All data and auth calls route through `dbClient`, `authClient`, `storageClient`, `aiClient`. Remaining work is **client module Supabase implementation** and **infrastructure removal**.

---

## Priority legend

| Priority | Meaning | Target milestone |
|----------|---------|------------------|
| **P0** | Blocks Supabase cutover | 7.4 |
| **P1** | Required for full feature parity | 7.4 |
| **P2** | Cleanup / bootstrap | 7.4–7.7 |
| **P3** | Cosmetic / non-blocking | 7.7 |
| **N/A** | Archived — do not execute | — |
| **Keep** | Reference only | — |

---

## P0 — Client modules (runtime backend)

### `src/api/base44Client.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 1 | `import { createClient } from '@base44/sdk'` | Delete file at cutover | P0 |
| 7–14 | `createClient({ appId, token, ... })` | `supabaseClient.js` singleton | P0 |

**Strategy:** Remove after all other client modules implement Supabase branches. Last file deleted in 7.4.6.

---

### `src/utils/dbClient.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 4 | Comment: routes through Base44 | Update comment | P2 |
| 13 | `import { base44 } from base44Client` | `import { supabase } from supabaseClient` | P0 |
| 102 | `base44.entities[entityName]` | `supabase.from(tableName)` in `makeEntity` | P0 |
| 137 | Stub throw for Supabase path | Implement full CRUD + subscribe | P0 |

**Strategy:** Implement `makeEntity` Supabase branch with filter parser, sort string, Realtime subscribe for Connection/Meeting. Covers 39 entities; ~60 page consumers already use `db.*`.

**Estimated effort:** 4–5 days

---

### `src/api/authClient.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 8 | `import { base44 } from base44Client` | `import { supabase } from supabaseClient` | P0 |
| 10 | `createAxiosClient` from `@base44/sdk` | Remove; static app config | P1 |
| 21–22 | `base44GetCurrentUser` → `base44.auth.me()` | `supabase.auth.getUser()` + `users` join | P0 |
| 25–35 | `base44CheckAppReady` → public settings API | Static config or health endpoint | P1 |
| 43 | `loginViaEmailPassword` | `signInWithPassword` | P0 |
| 48 | `loginWithProvider` | `signInWithOAuth` | P0 |
| 53 | `register` | `signUp` | P0 |
| 64–73 | `verifyOtp` / `confirmSignUp` | `supabase.auth.verifyOtp` | P0 |
| 82–83 | `setToken` | `supabase.auth.setSession` | P0 |
| 92–93 | `resendOtp` | `supabase.auth.resend` | P0 |
| 101 | `resetPasswordRequest` | `resetPasswordForEmail` | P0 |
| 107–108 | `resetPassword` | `updateUser` with recovery token | P0 |
| 117–118 | `updatePassword` | `updateUser` | P0 |
| 126 | `updateMe` | `updateUser` + `users` table | P0 |
| 132–133 | `logout` | `signOut` | P0 |
| 139 | `redirectToLogin` | React Router navigate | P0 |
| 145–146 | `onAuthStateChange` | `supabase.auth.onAuthStateChange` | P0 |
| 161 | `base44.functions.invoke("adminAuth")` | Edge Function `admin-auth` | P0 |

**Consumers:** `AuthContext.jsx`, Login, Register, ForgotPassword, ResetPassword, AdminLogin, Onboarding, AppLayout, PageNotFound, Profile (9 files).

**Estimated effort:** 3–4 days

---

### `src/api/storageClient.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 8 | `import { base44 } from base44Client` | `import { supabase } from supabaseClient` | P0 |
| 27 | `base44.integrations.Core.UploadFile` | `supabase.storage.upload` | P0 |
| 48 | `base44.integrations.Core.CreateFileSignedUrl` | `supabase.storage.createSignedUrl` | P0 |

**Consumers:** `assetPipeline.js`, OCRScanner, Onboarding, Products, CatalogLibrary, AdminExhibitors, AdminCatalogues, AdminMedia, ExhibitorSetupWizard (9 files).

**Estimated effort:** 2 days

---

### `src/api/aiClient.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 8 | `import { base44 } from base44Client` | Edge Function client | P0 |
| 29 | `base44.integrations.Core.InvokeLLM` | Edge Function `ai-invoke` | P1 |
| 40 | `base44.integrations.Core.ExtractDataFromUploadedFile` | Edge Function `ai-extract-document` | P1 |

**Consumers:** OCRScanner, Onboarding, AiBoothAssistant (3 files).

**Estimated effort:** 2–3 days (includes Edge Function deployment)

---

## P1 — Build tooling and backend functions

### `vite.config.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 1 | `import base44 from "@base44/vite-plugin"` | Remove import | P1 |
| 9–16 | `base44({ legacySDKImports, hmrNotifier, ... })` | Standard Vite config only | P1 |

**Strategy:** Remove after Supabase preview build verified. Expect smaller bundle.

**Estimated effort:** 0.5 day

---

### `base44/functions/adminAuth/entry.ts`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 1 | `createClientFromRequest` from SDK | Supabase Edge Function `admin-auth` | P1 |
| (full file) | Env-password admin login | Supabase Auth user with `app_metadata.role=admin` | P1 |

**Consumer:** `authClient.adminLogin` (via AdminLogin.jsx).

**Estimated effort:** 1 day

---

### `package.json`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 20–21 | `@base44/sdk`, `@base44/vite-plugin` | Remove dependencies | P0 |
| 13–17 | `phase6:*` npm scripts | Keep (archived); optional comment in README | N/A |

**Estimated effort:** 0.5 day (at cutover)

---

## P2 — Bootstrap and infrastructure

### `src/config/backend.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 4–16 | `VITE_DATA_BACKEND` switch `base44\|supabase` | Keep until cutover; hardcode `supabase` in 7.7 | P2 |

**Strategy:** Dual-backend switch remains valuable through 7.6 preview testing.

---

### `src/lib/app-params.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 13 | `localStorage` key `base44_${param}` | Rename to `boothbridge_${param}` or generic | P2 |
| 39 | `removeItem('base44_access_token')` | `supabase` session key or remove | P2 |

**Consumer:** `AuthContext.jsx`, `base44Client.js` (token from URL).

---

### `src/api/supabaseClient.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 3 | Comment references Base44 default | Update when cutover complete | P2 |
| (full file) | Lazy-init Supabase client | Activate as primary client in 7.4 | P0 |

---

### `public/sw.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 29 | Skip cache for `base44` hostnames | Add `supabase.co` exclusion | P2 |

---

### `src/utils/assetPipeline.js`

| Line | Purpose | Replacement | Priority |
|------|---------|-------------|----------|
| 9 | Comment: uses Base44 integrations | Update comment after storageClient Supabase branch | P2 |

**Note:** Already imports `storageClient` — no direct Base44 calls.

---

## P3 — Static assets (Base44 CDN)

| File | Line | Purpose | Replacement | Priority |
|------|------|---------|-------------|----------|
| `src/components/layout/AppLayout.jsx` | 18 | Logo URL on `media.base44.com` | `/public/logo.png` or Supabase Storage | P3 |
| `src/components/layout/AdminLayout.jsx` | 12 | Logo URL | Same | P3 |
| `src/components/AuthLayout.jsx` | 5 | Logo URL | Same | P3 |
| `src/pages/AdminLogin.jsx` | 9 | Logo URL | Same | P3 |
| `src/pages/Onboarding.jsx` | 259 | Logo URL in JSX | Same | P3 |

**Strategy:** Copy logo to `public/` or upload to `boothbridge-assets/branding/`. Single constant in shared config.

**Estimated effort:** 0.5 day

---

## Keep — Schema reference (not runtime)

| Path | Purpose | Action |
|------|---------|--------|
| `base44/entities/*.jsonc` | Entity schemas, RLS rules source | Keep for RLS translation in 7.2/7.4 |
| `base44/.app.jsonc` | App metadata | Keep as reference |
| `base44/config.jsonc` | App config | Keep as reference |

---

## N/A — Archived (Data Migration Waiver 2026-07-01)

**Do not execute.** Preserved for historical reference.

| Path | Purpose | Archive banner |
|------|---------|----------------|
| `scripts/phase6/README.md` | Operator guide | Yes |
| `scripts/phase6/export-entities.mjs` | Full JSON export (Gate 3) | Yes |
| `scripts/phase6/verify-infrastructure.mjs` | Gate 1 | Yes |
| `scripts/phase6/verify-uuid-sample.mjs` | Gate 2 | Yes |
| `scripts/phase6/generate-manifest.mjs` | Manifest generation (Gate 4) | Yes |
| `scripts/phase6/dry-run-estimate.mjs` | Heuristic estimates | Yes |
| `scripts/phase6/lib/paginated-export.mjs` | Export helpers | Yes |
| `scripts/phase6/lib/uuid-sampling.mjs` | UUID sample fetch | Yes |
| `scripts/phase6/lib/uuid-analysis.mjs` | UUID classification | Yes |
| `scripts/phase6/lib/json-writer.mjs` | JSON serialization | Yes |
| `scripts/phase6/lib/base44-client.mjs` | SDK client for scripts | Yes |
| `scripts/phase6/lib/resolve-app-id.mjs` | App ID resolver | Yes |
| `scripts/phase6/lib/entity-registry.mjs` | Entity map (also used by dry-run) | Yes |
| `base44/functions/phase6Export/entry.ts` | Service-role export API | Yes |
| `docs/phase6-export-dry-run-report.md` | Dry-run snapshot | Yes |
| `docs/phase6-infrastructure-verification-report.md` | Gate 1 report | Yes |
| `docs/phase6-uuid-compatibility-report.md` | Gate 2 template | Yes |
| `docs/phase6-documentation-sync-report.md` | 6C.3A.0 report | Yes |

**Import planning (6D):** Documented in [`phase6-master-execution-plan.md`](./phase6-master-execution-plan.md) §6D — marked NOT REQUIRED.

---

## Indirect dependencies (no Base44 import, Supabase work required)

These files use foundation clients that still delegate to Base44 internally:

| File | Client used | Base44 surface |
|------|-------------|----------------|
| `src/lib/AuthContext.jsx` | `auth` | auth.* via authClient |
| `src/hooks/useOfflineSync.js` | `db` | entities.* via dbClient |
| `src/utils/activityTracker.js` | `db` | entities.* via dbClient |
| ~60 pages in `src/pages/` | `db`, `auth`, `storage`, `ai` | Indirect via client modules |
| `src/components/AiBoothAssistant.jsx` | `ai` | InvokeLLM via aiClient |
| `src/components/layout/AdminLayout.jsx` | session guard | `bb_admin_authed` sessionStorage (Phase 7.4 admin unification) |

---

## Work estimate summary

| Workstream | Files | Days | Milestone |
|------------|-------|------|-----------|
| `dbClient` Supabase implementation | 1 | 4–5 | 7.4 |
| `authClient` Supabase + admin | 1 | 3–4 | 7.4 |
| `storageClient` + buckets | 1 + infra | 2 | 7.4 |
| `aiClient` + Edge Functions | 1 + 2 functions | 2–3 | 7.4 |
| RLS policies (new migration) | 39 entities | 3–4 | 7.2/7.4 |
| Admin session unification | AdminLayout, AdminLogin | 1–2 | 7.4 |
| Remove Base44 packages + vite | 3 | 1 | 7.4.6 |
| Logo re-host | 5 | 0.5 | 7.7 |
| Demo seed script | new | 2–3 | 7.5 |
| E2E verification | — | 3–5 | 7.6 |
| Production readiness | — | 2–3 | 7.7 |
| **Total** | | **24–33** → **plan 20–28** | |

With one senior engineer and parallel RLS/Edge Function work: **4–6 weeks**.

---

## Grep verification gates (Phase 7.4 exit)

```bash
# Must return 0 matches at cutover:
rg "from.*base44Client" src/
rg "@base44/sdk" src/
rg "base44\." src/ --glob "!**/api/*" --glob "!**/utils/dbClient.js"

# Archived scripts excluded from gate:
rg "base44" scripts/phase6/  # expected — archived
```

---

## Related documents

- [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md) — milestone roadmap
- [`base44-dependency-map.md`](./base44-dependency-map.md) — original pre-Phase-2 audit
- [`phase2-impact-report.md`](./phase2-impact-report.md) — mechanical refactor plan (largely complete)
- [`phase6-master-execution-plan.md`](./phase6-master-execution-plan.md) — Phase 6 closure

---

*Re-run this audit after Phase 7.4 to confirm zero runtime Base44 dependencies.*
