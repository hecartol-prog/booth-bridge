# Phase 1 — Foundation Layer Report

**Date:** 2026-06-13  
**Phase:** 1 — Foundation Layer Preparation  
**Status:** Complete  
**Default backend:** `VITE_DATA_BACKEND=base44` (unchanged)

---

## Executive Summary

Phase 1 added the migration foundation layer without wiring it into pages, auth, storage, or database flows. All user-facing behavior remains on Base44 exactly as before. New client modules delegate to Base44 when the default backend is active. `dbClient.js` now exposes all 39 application entities through a unified interface with a Supabase stub path for Phase 4.

**No page components, routes, UI, NFC, QR, OCR, or offline sync code was modified.**

---

## Files Created

| File | Purpose |
|------|---------|
| `src/config/backend.js` | Central `VITE_DATA_BACKEND` switch (`base44` \| `supabase`), `isAiEnabled()`, Supabase env detection |
| `src/api/supabaseClient.js` | Lazy `@supabase/supabase-js` singleton; only initialized when backend is `supabase` |
| `src/api/authClient.js` | Auth abstraction mirroring `base44.auth` + admin function; Base44 delegation today |
| `src/api/storageClient.js` | Upload + signed URL abstraction mirroring `integrations.Core` |
| `src/api/aiClient.js` | LLM + document extract abstraction; preset helpers for OCR/assistant |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/utils/dbClient.js` | Added 14 missing entities; `ENTITY_TABLE_MAP` + `ALL_ENTITY_NAMES`; `parseSort()`; `makeEntity()` backend switch; Supabase stub throws until Phase 4 |
| `package.json` | Added `@supabase/supabase-js` dependency |
| `package-lock.json` | Lockfile updated via `npm install` |

---

## Abstraction Layer Purposes

### `src/config/backend.js`

Single configuration surface for migration phases:

- `DATA_BACKEND` — reads `VITE_DATA_BACKEND`, defaults to `base44`
- `isBase44()` / `isSupabase()` — used by all client modules
- `isAiEnabled()` — optional `VITE_AI_ENABLED=false` kill switch for cutover
- `isSupabaseConfigured()` — checks URL + anon key without activating Supabase

### `src/api/supabaseClient.js`

Prepares Supabase JS client without loading it in production today. `getSupabaseClient()` throws unless `VITE_DATA_BACKEND=supabase` and env vars are set.

### `src/api/authClient.js`

Maps future `AuthContext` and login flows to one module:

| Export | Base44 delegate (active today) |
|--------|------------------------------|
| `getCurrentUser` | `base44.auth.me()` |
| `loginWithEmailPassword` | `loginViaEmailPassword` |
| `loginWithProvider` | `loginWithProvider` |
| `register` | `register` |
| `verifyOtp` | `verifyOtp` / `confirmSignUp` if available |
| `requestPasswordReset` | `resetPasswordRequest` |
| `updateUserMetadata` | `updateMe` |
| `logout` / `redirectToLogin` | SDK logout / redirect |
| `checkAppReady` | `/api/apps/public/prod/public-settings/...` |
| `adminLogin` | `functions.invoke("adminAuth")` |
| `isAdminSession` | `sessionStorage bb_admin_authed` |

**Not imported by any page in Phase 1.**

### `src/api/storageClient.js`

| Export | Base44 delegate (active today) |
|--------|------------------------------|
| `uploadFile` | `integrations.Core.UploadFile` |
| `getSignedUrl` | `integrations.Core.CreateFileSignedUrl` |
| `getPublicUrl` | Returns `http` URLs as-is on Base44 |

**Not imported by pages or `assetPipeline.js` in Phase 1.**

### `src/api/aiClient.js`

| Export | Base44 delegate (active today) |
|--------|------------------------------|
| `invokeLLM` | `integrations.Core.InvokeLLM` |
| `extractFromUploadedFile` | `integrations.Core.ExtractDataFromUploadedFile` |
| `extractBusinessCard` / `extractBadge` | Preset `invokeLLM` prompts (for Phase 2 OCR wiring) |
| `boothAssistantChat` | Preset assistant prompt wrapper |

**Not imported by OCR, onboarding, or AiBoothAssistant in Phase 1.**

### `src/utils/dbClient.js` (expanded)

**Before:** 25 entities, Base44-only `makeEntity`.  
**After:** 39 entities, backend-aware factory.

**New entities on `db` export:**

- `User`
- `AdminAccessLog`
- `BillingSubscription`
- `BillingTransaction`
- `NFCProfile`
- `NFCInteraction`
- `NFCProductTag`
- `ScannedContact`
- `PremiumBoothSubscription`
- `SponsoredListing`
- `SupportTicket`
- `SystemAlert`
- `StressTestResult`
- `VerificationProfile`

**Added utilities:**

- `ENTITY_TABLE_MAP` — PascalCase → snake_case Postgres table names
- `ALL_ENTITY_NAMES` — canonical entity list
- `parseSort()` — `-created_date` convention parser for future Supabase queries

**Runtime behavior:** With default `base44` backend, `makeBase44Entity()` is identical to pre-Phase-1 logic. Existing `dbClient` consumers (`SupplierCompare`, `DigitalBooth`, `BuyerDashboard`, `PremiumBooth`, `CreateProjectSheet`) unchanged.

---

## Migration Readiness Improvements

| Area | Before Phase 1 | After Phase 1 |
|------|----------------|---------------|
| Entity coverage in dbClient | 25 / 39 | **39 / 39** |
| Backend switch | Implicit (comments only) | **Explicit `VITE_DATA_BACKEND`** |
| Auth migration path | Direct `base44.auth` in 13+ files | **`authClient.js` ready** |
| Storage migration path | Direct integrations in 12+ files | **`storageClient.js` ready** |
| AI/OCR migration path | Direct integrations in 4 files | **`aiClient.js` ready** |
| Supabase SDK | Not installed | **Installed, lazy client ready** |
| Table name mapping | None | **`ENTITY_TABLE_MAP` for Phase 4** |

---

## Risks Discovered

| Risk | Severity | Notes |
|------|----------|-------|
| New modules not yet wired | Low (intentional) | Zero runtime change until Phase 2 import swap |
| `VITE_DATA_BACKEND=supabase` without Phase 4 | Medium | dbClient/auth/storage/ai throw clear errors; app would break if env set prematurely |
| `verifyOtp` SDK method variance | Low | authClient probes `verifyOtp` / `confirmSignUp` on Base44 SDK |
| Typecheck pre-existing failures | Low | `npm run typecheck` reports errors in pages; unrelated to Phase 1 files |
| npm audit vulnerabilities | Low | 18 reported on install; pre-existing dependency tree |
| `User` table name in Postgres | Medium (Phase 4) | `ENTITY_TABLE_MAP.User` → `user`; may need quoting as `"user"` in SQL |
| Bundle size | Low | `@supabase/supabase-js` added but tree-shaken until `supabaseClient` is imported from app entry (not today) |

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** (exit 0, `dist/index.html` present) |
| New modules imported from pages | **PASS** — zero page imports of auth/storage/ai/supabase clients |
| Pages still use `base44Client` directly | **PASS** — ~60 page files unchanged |
| Routes modified | **PASS** — `App.jsx` not touched |
| UI / page components modified | **PASS** — no `src/pages/**` changes |
| NFC / QR / OCR / offline sync touched | **PASS** — no changes to ScanQR, NFC*, OCRScanner, offline queues |
| Linter on new/modified foundation files | **PASS** — no issues reported |
| `npm run typecheck` | **FAIL** (pre-existing project errors; Phase 1 files excluded from jsconfig `include`) |

---

## Intentionally Not Done (Phase 2+)

- Replace `import { base44 }` in pages with `db` / `auth` / `storage` / `ai`
- Wire `AuthContext` to `authClient`
- Wire `assetPipeline.js` to `storageClient`
- Wire OCR / onboarding / AI assistant to `aiClient`
- Implement Supabase queries in `dbClient`
- Supabase schema, RLS, Storage, Edge Functions
- Remove `@base44/sdk` or `@base44/vite-plugin`
- Vercel deployment configuration

---

## Remaining Work Before Phase 2

1. **Mechanical import refactor** — Replace `base44.entities.*` → `db.*` across ~60 page files + hooks (`useOfflineSync`, `activityTracker`).
2. **Replace integration calls** — `UploadFile` / `InvokeLLM` → `storage` / `ai` in upload and AI surfaces.
3. **Replace auth calls** — `Login`, `Register`, `AuthContext`, `AdminLogin`, etc. → `authClient`.
4. **Regression suite** — Run Phase 0 smoke checklist on Base44 after Phase 2 completes.
5. **Optional** — Add `.env.example` documenting `VITE_DATA_BACKEND`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AI_ENABLED`.

---

## Environment Variables (Reference)

| Variable | Default | Phase active |
|----------|---------|--------------|
| `VITE_DATA_BACKEND` | `base44` | Phase 1+ |
| `VITE_SUPABASE_URL` | unset | Phase 4+ |
| `VITE_SUPABASE_ANON_KEY` | unset | Phase 4+ |
| `VITE_AI_ENABLED` | `true` (any value except `false`) | Phase 4+ |

---

## Related Documents

- [Migration Execution Roadmap](./migration-execution-roadmap.md)
- [Architecture Audit](./architecture-audit.md)
- [Migration Readiness Report](./migration-readiness-report.md)
- [Base44 Dependency Map](./base44-dependency-map.md)
