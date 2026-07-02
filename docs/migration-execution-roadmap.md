# BoothBridge Migration Execution Roadmap

**Role:** Lead Migration Architect  
**Generated:** 2026-06-13  
**Updated:** 2026-07-01 (Phase 6 closed; Phase 7 redefined)  
**Target state:** Base44 Independence → Supabase Backend → Vercel Deployment  
**Strategy:** Schema-only migration — **no Base44 data import** (Data Migration Waiver 2026-07-01)  
**Constraints:** Vite + React retained; all routes preserved; NFC / QR / OCR / offline sync preserved; no Next.js; no TypeScript migration

**Active implementation roadmap:** [**phase7-complete-supabase-transition.md**](./phase7-complete-supabase-transition.md)  
**Source documents:** [architecture-audit.md](./architecture-audit.md), [migration-readiness-report.md](./migration-readiness-report.md), [base44-dependency-map.md](./base44-dependency-map.md)

---

## 1. Strategic Principles

### Minimum-risk approach

The fewest code changes are achieved by **not rewriting pages**. Instead:

1. **Introduce four client modules** that mirror today's Base44 call patterns.
2. **Expand `dbClient.js`** to cover all 39 entities with a stable API (`list`, `filter`, `get`, `create`, `update`, `delete`, `subscribe`).
3. **Route all platform calls** through those modules — pages import clients, never `@base44/sdk`.
4. **Use an environment switch** (`VITE_DATA_BACKEND=base44|supabase`) so each phase can run against Base44 until Supabase parity is verified.
5. **Dual-run window:** production stays on Base44 until Phase 6 sign-off; Supabase validated in staging on Vercel preview deployments.

### What we deliberately do not change

| Preserve | Rationale |
|----------|-----------|
| `App.jsx` route tree | Zero route churn |
| Page components (UI/UX) | Only import paths and client calls change |
| Offline queues (`offlineScanQueue`, `visitorInteractionQueue`) | Backend-agnostic |
| QR payload format `boothbridge:connect:{id}:{role}` | NFC tags and printed QR remain valid |
| NFC URL pattern `/nfc/:userId` | Physical badge URLs unchanged |
| `leadScoring.js`, `securitySanitizer.js`, i18n | Pure client logic |
| Service worker strategy | Update host exclusions only |

### Target architecture (post-migration)

```
┌─────────────────────────────────────────────────────────────────┐
│  React 18 + Vite 6 + React Router (unchanged)                    │
├─────────────────────────────────────────────────────────────────┤
│  Pages / hooks / components                                        │
│    import only: db, auth, storage, ai from src/api or src/utils    │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ dbClient.js  │ authClient.js│storageClient │ aiClient.js         │
│ (expanded)   │              │ .js          │                     │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│  supabaseClient.js (singleton @supabase/supabase-js)             │
├─────────────────────────────────────────────────────────────────┤
│  Supabase: Postgres + RLS | Auth | Storage | Realtime | Edge Fn  │
├─────────────────────────────────────────────────────────────────┤
│  Vercel: static dist + env vars + preview/staging/production    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Client Module Specifications

### 2.1 `src/api/authClient.js`

**Purpose:** Replace every `base44.auth` and admin-auth function call. `AuthContext` becomes the only file that imports this module (pages keep using `useAuth()`).

| Method | Maps from Base44 | Supabase implementation |
|--------|------------------|-------------------------|
| `getCurrentUser()` | `base44.auth.me()` | `supabase.auth.getUser()` + join `users` / profile metadata |
| `loginWithEmailPassword(email, password)` | `loginViaEmailPassword` | `signInWithPassword` |
| `loginWithProvider(provider, redirectPath)` | `loginWithProvider` | `signInWithOAuth` (google, linkedin) |
| `register({ email, password })` | `register` | `signUp` + email confirmation flow |
| `verifyOtp(email, token)` | Register OTP step | `verifyOtp` |
| `requestPasswordReset(email)` | `resetPasswordRequest` | `resetPasswordForEmail` |
| `updatePassword(newPassword)` | Reset flow | `updateUser` |
| `updateUserMetadata(fields)` | `updateMe` | `updateUser` + `users` table update |
| `logout(redirectUrl?)` | `logout` | `signOut` + optional `window.location` |
| `redirectToLogin(returnUrl)` | `redirectToLogin` | Navigate to `/login` (no SDK redirect) |
| `onAuthStateChange(callback)` | implicit in AuthContext | `supabase.auth.onAuthStateChange` |
| `checkAppReady()` | `/api/apps/public/...` | Return static app config or lightweight health check |
| `adminLogin(email, password)` | `functions.invoke("adminAuth")` | Edge Function `admin-auth` or Supabase user with `app_metadata.role=admin` |
| `isAdminSession()` | `sessionStorage bb_admin_authed` | **Deprecated** — use `getCurrentUser().role === 'admin'` |

**User shape (normalized):** Preserve fields pages already read:

```javascript
{
  id, email, full_name, role, user_role, onboarded, profile_id,
  // from users table / app_metadata
}
```

**Files that eventually stop importing `base44` for auth (13):**

`AuthContext.jsx`, `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `AdminLogin.jsx`, `Onboarding.jsx`, `AppLayout.jsx`, `PageNotFound.jsx`, plus indirect via `useAuth()` everywhere else.

**Dual-backend:** When `VITE_DATA_BACKEND=base44`, delegate to `base44.auth` inside `authClient.js` only.

---

### 2.2 `src/api/storageClient.js`

**Purpose:** Replace `base44.integrations.Core.UploadFile` and `CreateFileSignedUrl`. Supersedes direct integration calls in pages; `assetPipeline.js` imports this instead of `base44`.

| Method | Maps from Base44 | Supabase implementation |
|--------|------------------|-------------------------|
| `uploadFile(file, { bucket, path })` | `UploadFile` | `supabase.storage.from(bucket).upload(path, file)` |
| `getSignedUrl(filePath, { bucket, expiresIn })` | `CreateFileSignedUrl` | `createSignedUrl` |
| `getPublicUrl(filePath, bucket)` | legacy `http` URLs | `getPublicUrl` for public buckets |
| `downloadCatalog(fileUri, options)` | assetPipeline helper | signed URL + optional count callback |

**Bucket mapping (from `assetPipeline.js` design):**

| Bucket | Path pattern | Visibility |
|--------|--------------|------------|
| `boothbridge-assets` | `events/{event_id}/branding/{filename}` | private (signed) |
| `boothbridge-assets` | `companies/{company_id}/catalogs/{filename}` | private (signed) |
| `boothbridge-media` | `uploads/{user_id}/{filename}` | private |
| `boothbridge-ocr` | `scans/{user_id}/{filename}` | private |

**Store in entities:** Continue storing path or full URI in `file_url` / `raw_image_url`; `getSignedUrl` resolves at read time.

**Files affected when wired (12 upload sites + assetPipeline):**

`assetPipeline.js`, `OCRScanner.jsx`, `Onboarding.jsx`, `Products.jsx`, `CatalogLibrary.jsx`, `AdminExhibitors.jsx`, `AdminCatalogues.jsx`, `AdminMedia.jsx`, `ExhibitorSetupWizard.jsx`, `AiBoothAssistant.jsx` (if images added), any page using `downloadCatalog`.

**Dual-backend:** Base44 branch calls `base44.integrations.Core.*` inside `storageClient.js` only.

---

### 2.3 `src/api/aiClient.js`

**Purpose:** Replace `InvokeLLM` and `ExtractDataFromUploadedFile` for OCR, onboarding, and AI assistant.

| Method | Maps from Base44 | Supabase implementation |
|--------|------------------|-------------------------|
| `invokeLLM({ prompt, response_json_schema, ... })` | `InvokeLLM` | Edge Function `ai-invoke` → OpenAI / Anthropic with structured output |
| `extractFromUploadedFile({ file_url, schema })` | `ExtractDataFromUploadedFile` | Edge Function `ai-extract-document` (vision model) |
| `extractBusinessCard(imageUrl)` | Onboarding OCR | Preset prompt + schema wrapper |
| `extractBadge(imageUrl)` | OCR scanner badge mode | Preset prompt + schema wrapper |
| `boothAssistantChat({ context, history, message })` | AiBoothAssistant | `invokeLLM` with booth context template |

**Security:** All LLM calls go through Edge Functions — API keys never in Vite bundle.

**Files affected (4):**

`OCRScanner.jsx`, `Onboarding.jsx`, `AiBoothAssistant.jsx`, `aiClient.js` itself.

**Feature flag:** `VITE_AI_ENABLED=false` returns graceful error in UI (OCR/assistant show "temporarily unavailable") without blocking migration cutover.

**Dual-backend:** Base44 branch calls `base44.integrations.Core.*` inside `aiClient.js` only.

---

### 2.4 `src/utils/dbClient.js` expansion

**Purpose:** Single data access surface for all 39 entities. Pages replace `base44.entities.X` with `db.X`.

#### Entities to add (14 missing from current export)

| Entity | Priority | Primary consumers |
|--------|----------|-----------------|
| User | P0 | AdminUsers, AdminDashboard, EventSupportCenter |
| NFCProfile | P0 | NFCExchange, NFCProfileView, NFCOrganizerPanel, AdminNFCValidation |
| NFCInteraction | P0 | NFCExchange, NFCProfileView, NFCOrganizerPanel |
| NFCProductTag | P1 | NFCOrganizerPanel, AdminNFCValidation, AdminGlobalSearch |
| ScannedContact | P0 | OCRScanner, ScannedContacts, AdminOCRReview |
| BillingSubscription | P1 | BillingCenter |
| BillingTransaction | P1 | BillingCenter, AdminDashboard |
| PremiumBoothSubscription | P1 | PremiumBooth, AdminDashboard |
| SponsoredListing | P2 | AdminRevenue, OrganizerCommandCenter |
| SupportTicket | P1 | AdminSupportTickets, EventSupportCenter, AdminGlobalSearch |
| AdminAccessLog | P2 | AdminAuditLog, AdminLogin |
| SystemAlert | P2 | AdminMonitoring |
| StressTestResult | P3 | AdminStressTest |
| VerificationProfile | P3 | (schema only today) |

#### Supabase table mapping

One Postgres table per entity, snake_case columns matching JSONC field names. Preserve `id` as `uuid` PK. Use **`created_date` / `updated_date`** column names (matches Base44 and repo migrations). Add `legacy_base44_id` where remapping may be needed.

#### `subscribe()` implementation

| Entity | Current usage | Supabase approach |
|--------|---------------|-------------------|
| Connection | Connections.jsx | Realtime `postgres_changes` on `connection` filtered by user |
| Meeting | Meetings.jsx | Realtime on `meeting` filtered by `proposed_by` / `proposed_to` |

Return unsubscribe function matching current SDK pattern.

#### Query compatibility layer

Base44 `filter(query, sort, limit)` → Supabase:

```javascript
// filter({ exhibitor_user_id: user.id }, "-created_date", 200)
// → .from('connection').select('*').eq('exhibitor_user_id', id).order('created_at', { ascending: false }).limit(200)
```

Implement sort string parser (`-field` = descending) once in `dbClient.js`.

#### Dual-backend

When `VITE_DATA_BACKEND=base44`, `makeEntity()` keeps current `base44.entities` proxy. When `supabase`, use `supabase.from(tableName)`.

**Files affected when pages switch imports (~65–70):** All files listed in [base44-dependency-map.md](./base44-dependency-map.md) plus `useOfflineSync.js`, `activityTracker.js`.

---

## 3. Supabase Backend Blueprint (no app code — infra only)

Executed in parallel with Phases 1–2. **Schema migrations now live in `supabase/migrations/`** (Phase 6C.1 — 39 entity tables; not yet applied to a Supabase project).

| Workstream | Deliverable |
|------------|-------------|
| Schema | 39 tables from `base44/entities/*.jsonc` |
| RLS | Policies translated from JSONC `rls` blocks |
| Auth | Email, Google, LinkedIn providers; `users` extension table |
| Storage | Buckets + policies per `storageClient` |
| Edge Functions | `admin-auth`, `ai-invoke`, `ai-extract-document` |
| Realtime | Enable on `connection`, `meeting` |
| Data seeding | Clean demo data in Phase 7.5 (no Base44 import) |

**Admin unification:** Create admin users in Supabase Auth with `app_metadata.role = 'admin'`. Retire `bb_admin_authed` session flag in Phase 5.

---

## 4. Vercel Deployment Blueprint

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20.x |

**Environment variables (Vercel):**

| Variable | Environment | Purpose |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | all | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | all | Public anon key |
| `VITE_DATA_BACKEND` | preview=supabase, prod=base44→supabase | Backend switch |
| `VITE_AI_ENABLED` | all | LLM feature flag |
| `VITE_APP_URL` | all | OAuth redirect base |

**Edge secrets (Supabase, not Vercel):** `OPENAI_API_KEY`, `ADMIN_EMAIL` / `ADMIN_PASSWORD` (if legacy admin fn kept briefly).

**Service worker:** Update `public/sw.js` to exclude `*.supabase.co` from cache (same as Base44 exclusion).

**Rollback:** Vercel instant rollback to previous deployment; set `VITE_DATA_BACKEND=base44` on production until cutover.

---

## 5. Phase Execution Plan

### Overview timeline

| Phase | Name | Duration est. | Production impact |
|-------|------|---------------|-------------------|
| 0 | Freeze & baseline | 1–2 days | None |
| 1 | Client scaffolding + dbClient expansion | 3–5 days | None (Base44 default) |
| 2 | Mechanical import refactor | 4–6 days | None (still Base44) |
| 3 | Supabase backend provision | 5–10 days | None (staging only) |
| 4 | Wire clients to Supabase (staging) | 5–7 days | None |
| 5 | Auth + admin unification | 3–5 days | Staging |
| 6 | Data migration | **CLOSED (waived)** | None — demo data only |
| 7 | Complete Supabase transition | 4–6 weeks | Staging → **Cutover** |
| 8 | Vercel hardening + monitoring | 1–2 days | Post-cutover |

**Total estimate:** Phase 7 is 4–6 weeks with one senior engineer. See [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md).

---

### Phase 0 — Freeze & baseline

**Objective:** Lock reference behavior before any refactor.

| Metric | Value |
|--------|-------|
| **Files affected** | 0 code; tag + docs only |
| **Risk** | **Low** |

**Actions:**
- Confirm tag `boothbridge-base44-final` on `main`
- Branch `migration/base44-independence` for all work
- Record manual smoke test results (checklist below) against Base44 production/staging
- Export entity counts per collection from Base44 (for import validation)

**Rollback:** N/A

**Testing checklist:**
- [ ] All routes in [route-map.md](./route-map.md) load without error
- [ ] Login (email, Google, LinkedIn)
- [ ] Register + OTP
- [ ] Buyer: scan QR → DigitalBooth → connection created
- [ ] Offline scan → reconnect → sync
- [ ] OCR business card + badge save
- [ ] NFC profile edit + public `/nfc/:userId` view
- [ ] Exhibitor: RFI inbox reply, meetings propose/accept
- [ ] Admin login + dashboard loads
- [ ] Catalog upload + signed download

---

### Phase 1 — Client scaffolding + dbClient expansion

**Objective:** Add new modules and expand `dbClient` **without changing runtime behavior** (default `VITE_DATA_BACKEND=base44`).

| Metric | Value |
|--------|-------|
| **Files affected** | **~8–12 new/edited** |
| **Risk** | **Low** |

**New files:**
- `src/api/supabaseClient.js`
- `src/api/authClient.js` (Base44 delegate)
- `src/api/storageClient.js` (Base44 delegate)
- `src/api/aiClient.js` (Base44 delegate)
- `src/config/backend.js` (reads `VITE_DATA_BACKEND`)

**Edited files:**
- `src/utils/dbClient.js` (+14 entities, sort parser, backend switch stub)
- `package.json` (+ `@supabase/supabase-js`)
- `.env.example` (document vars)

**No page imports changed yet.**

**Rollback:** Revert branch commits; no production config change.

**Testing checklist:**
- [ ] `npm run build` succeeds
- [ ] `npm run dev` — app identical to Phase 0
- [ ] Unit smoke: `db.User.list()` callable (returns data via Base44 path)
- [ ] All 39 entities present on `db` export
- [ ] No new runtime errors in console

---

### Phase 2 — Mechanical import refactor (still Base44)

**Objective:** Eliminate direct `base44` imports from pages; single choke point per concern.

| Metric | Value |
|--------|-------|
| **Files affected** | **~72–78** |
| **Risk** | **Medium** |

**Change pattern (mechanical):**

| Before | After |
|--------|-------|
| `import { base44 } from "@/api/base44Client"` | Remove |
| `base44.entities.Connection.filter(...)` | `db.Connection.filter(...)` |
| `base44.auth.loginViaEmailPassword` | `auth.loginWithEmailPassword` |
| `base44.integrations.Core.UploadFile` | `storage.uploadFile` |
| `base44.integrations.Core.InvokeLLM` | `ai.invokeLLM` |
| `base44.functions.invoke("adminAuth")` | `auth.adminLogin` |

**File groups:**

| Group | Count | Files |
|-------|-------|-------|
| Pages (`src/pages/**`) | ~58 | All pages importing base44 |
| Hooks/utils | 3 | `useOfflineSync`, `activityTracker`, `assetPipeline` |
| Components | 2 | `AppLayout`, `AiBoothAssistant` |
| Lib | 2 | `AuthContext`, `PageNotFound` |
| Keep base44 import | 4 | `base44Client.js`, `authClient.js`, `storageClient.js`, `aiClient.js`, `dbClient.js` |

**Rollback:** Revert to Phase 1 branch; `VITE_DATA_BACKEND=base44` unchanged.

**Testing checklist:**
- [ ] Full Phase 0 smoke suite passes
- [ ] `grep -r "from.*base44Client" src/pages` returns **0** matches
- [ ] `grep -r "base44\." src/pages` returns **0** matches
- [ ] Connection + Meeting realtime still updates UI
- [ ] Admin login + audit log write
- [ ] No bundle reference to pages importing `@base44/sdk` directly

---

### Phase 3 — Supabase backend provision

**Objective:** Postgres schema, RLS, Storage, Edge Functions ready; **no production cutover**.

| Metric | Value |
|--------|-------|
| **Files affected** | **0 app code** (Supabase dashboard/CLI only) |
| **Risk** | **Medium** (schema/RLS mistakes) |

**Deliverables:**
- 39 tables + indexes on common filter columns (`user_id`, `exhibitor_user_id`, `buyer_user_id`, `connection_id`)
- RLS policies per entity JSONC
- Auth providers configured (Google, LinkedIn redirect URLs include Vercel preview URL)
- Storage buckets + RLS
- Edge Functions deployed
- Seed script: 1 admin user, 1 exhibitor, 1 buyer for staging

**Rollback:** Drop staging Supabase project or reset DB; Base44 production unaffected.

**Testing checklist:**
- [ ] Supabase SQL: `select count(*) from connection` etc. on empty DB
- [ ] RLS: buyer cannot read another buyer's `saved_booth`
- [ ] RLS: admin role can read `admin_access_log`
- [ ] Storage: upload test file to `boothbridge-assets` as authenticated user
- [ ] Edge `ai-invoke` returns JSON schema response
- [ ] Edge `admin-auth` rejects bad credentials
- [ ] Realtime subscription receives insert on `connection`

---

### Phase 4 — Wire clients to Supabase (staging on Vercel)

**Objective:** Implement Supabase branches inside the four client modules; deploy preview with `VITE_DATA_BACKEND=supabase`.

| Metric | Value |
|--------|-------|
| **Files affected** | **~6–10** (client modules + AuthContext + env) |
| **Risk** | **High** |

**Edited files:**
- `authClient.js` — Supabase branch
- `storageClient.js` — Supabase branch
- `aiClient.js` — Supabase branch
- `dbClient.js` — Supabase `makeEntity` implementation
- `AuthContext.jsx` — remove axios public-settings call; use `auth.checkAppReady()`
- `vite.config.js` — remove `@base44/vite-plugin` **only on staging branch test** (optional sub-step)
- `public/sw.js` — exclude Supabase host

**Vercel:** Preview deployment with Supabase env vars.

**Rollback:** Set `VITE_DATA_BACKEND=base44` on preview; production unchanged.

**Testing checklist:**
- [ ] Full Phase 0 suite on **Vercel preview** + Supabase staging data
- [ ] Auth: register, login, logout, password reset email received
- [ ] OAuth Google + LinkedIn on preview URL
- [ ] CRUD: product create, catalog upload, connection create
- [ ] QR scan → connection (online)
- [ ] Offline scan queue → sync after reconnect
- [ ] OCR: upload image → LLM extract → ScannedContact save
- [ ] AI assistant responds on DigitalBooth
- [ ] NFC public profile loads `/nfc/:userId`
- [ ] Meetings realtime update
- [ ] Admin: login as Supabase admin user, all admin routes load
- [ ] Compare API error rate vs Base44 staging (manual log review)

---

### Phase 5 — Auth + admin unification

**Objective:** Single auth system; deprecate `sessionStorage bb_admin_authed`.

| Metric | Value |
|--------|-------|
| **Files affected** | **~5–8** |
| **Risk** | **High** |

**Changes:**
- `AdminLayout.jsx` — guard via `useAuth()` + `role === 'admin'` instead of sessionStorage
- `AdminLogin.jsx` — use `auth.loginWithEmailPassword` for admin users (or keep separate admin-only accounts)
- Remove `base44/functions/adminAuth` dependency
- Map `onboarded`, `user_role` to `users` table columns
- `AppLayout` admin impersonation — keep `bb_impersonate_as_user` (localStorage only)

**Rollback:** Re-enable `bb_admin_authed` guard behind feature flag `VITE_LEGACY_ADMIN_SESSION=true`.

**Testing checklist:**
- [ ] Non-admin user cannot access `/admin` (redirect to login or 403)
- [ ] Admin user accesses all `/admin/*` routes
- [ ] Admin logout clears Supabase session
- [ ] User login still works for buyer/exhibitor
- [ ] Onboarding gate still works (`onboarded`, `user_role`)
- [ ] Organizer pages that link to `/admin/*` — verify intended behavior documented

---

### Phase 6 — Data migration — CLOSED (waived 2026-07-01)

> **Data Migration Waiver:** Base44 contains only demonstration/test data. Export/import pipeline archived; not executed.

**Canonical record:** [`phase6-master-execution-plan.md`](./phase6-master-execution-plan.md)

| Sub-phase | Status |
|-----------|--------|
| 6C.1 Schema in repo | **Complete** |
| 6C.2 Export tooling | **Complete (archived)** |
| 6C.3 Infrastructure validation | **Complete** |
| 6C.4 Data migration | **WAIVED** |
| 6D Import | **NOT REQUIRED** |

**Do not execute:** Gates 1–3, export, UUID verification, manifest generation, import.

---

### Phase 7 — Complete Supabase transition

> **Supersedes** the previous "production cutover + Base44 removal" section.  
> **Canonical plan:** [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)

**Objective:** Migrate application, schema, business logic, auth, and infrastructure to Supabase with a **clean database** (no Base44 record import).

| Milestone | Goal | Est. |
|-----------|------|------|
| 7.1 | Provision Supabase production project | 1–2 days |
| 7.2 | Apply all migrations (39 tables) | 1–2 days |
| 7.3 | Base44 dependency audit | 1 day (complete) |
| 7.4 | Refactor client layer to Supabase | 10–15 days |
| 7.5 | Seed clean demo database | 2–3 days |
| 7.6 | End-to-end verification | 3–5 days |
| 7.7 | Production readiness review | 2–3 days |

**Cutover sequence:**
1. Vercel preview with `VITE_DATA_BACKEND=supabase` — full smoke suite (7.6)
2. Production readiness sign-off (7.7)
3. Vercel production: `VITE_DATA_BACKEND=supabase`, deploy
4. Remove `@base44/sdk`, `@base44/vite-plugin`, `base44Client.js`
5. Keep `base44/entities/` as schema reference

**Rollback:** Vercel instant rollback; `VITE_DATA_BACKEND=base44` for 48h emergency window.

**Testing checklist:**
- [ ] Phase 0 smoke suite on Vercel preview + Supabase seeded data
- [ ] NFC, QR, OCR, offline sync pass
- [ ] Admin RBAC via Supabase Auth only
- [ ] `npm run build` with zero `@base44/*` dependencies
- [ ] Production smoke after cutover; monitor 24h

**Dependency audit:** [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md)

---

### Phase 8 — Vercel hardening + monitoring

**Objective:** Production stability post-cutover.

| Metric | Value |
|--------|-------|
| **Files affected** | **~2–5** (vercel.json, sw.js, optional health endpoint) |
| **Risk** | **Low** |

**Actions:**
- `vercel.json`: SPA rewrites for React Router (`/*` → `/index.html`)
- Security headers (CSP allowing Supabase domains)
- Vercel Analytics or external monitoring
- Supabase dashboard alerts (Edge Function errors, DB CPU)

**Rollback:** N/A (hardening only)

**Testing checklist:**
- [ ] Deep link `/nfc/:userId` works on cold load
- [ ] Deep link `/admin/leads` works on cold load
- [ ] 404 → `PageNotFound` for unknown routes
- [ ] Service worker does not cache Supabase API responses

---

## 6. Risk Matrix Summary

| Phase | Risk | Primary mitigation |
|-------|------|-------------------|
| 0 | Low | Baseline tests |
| 1 | Low | No page changes |
| 2 | Medium | Mechanical refactor + full regression on Base44 |
| 3 | Medium | Staging-only Supabase |
| 4 | High | Vercel preview + feature flags |
| 5 | High | Legacy admin session flag fallback |
| 6 | **Waived** | Schema delivered; no data import |
| 7 | Critical | Phase 7.7 checklist + Vercel rollback |
| 8 | Low | Monitoring |

---

## 7. NFC / QR / OCR / Offline — Migration Guardrails

| Feature | Must not change | Migration touchpoint |
|---------|-----------------|----------------------|
| QR payload | `boothbridge:connect:{userId}:{role}` | None — client only |
| QR scan flow | ScanQR → DigitalBooth | `db.Connection`, `db.Notification` |
| Offline scan queue | IndexedDB schema | `useOfflineSync` → `db.*` only (Phase 2) |
| NFC URL | `/nfc/:userId` | Route unchanged; `db.NFCProfile` |
| NFC identifier | `bb-nfc-{userId}-*` pattern | Preserve on import |
| OCR pipeline | Upload → LLM → sanitize → ScannedContact | `storage` + `ai` + `db.ScannedContact` |
| Onboarding extract | ExtractDataFromUploadedFile | `ai.extractFromUploadedFile` |

**Regression gate:** These four flows must pass in Phase 4 staging and Phase 7 production before sign-off.

---

## 8. File Impact Summary

| Phase | New files | Modified files | Deleted files (end state) |
|-------|-----------|----------------|---------------------------|
| 1 | 5 | 2–3 | 0 |
| 2 | 0 | ~72 | 0 |
| 3 | 0 (Supabase) | 0 | 0 |
| 4 | 0 | 6–10 | 0 |
| 5 | 0 | 5–8 | 0 |
| 6 | scripts + Supabase migrations | 0 | 0 |
| 7 | 0 | 8–15 | `base44Client.js`, deps |
| 8 | 1 (`vercel.json`) | 2 | 0 |

**Cumulative page churn:** ~72 files change imports in Phase 2 only; Phases 4–5 touch auth/admin subset again.

---

## 9. Definition of Done — Base44 Independence

- [ ] Zero `import` from `@base44/sdk` or `@base44/vite-plugin` in `src/`
- [ ] Zero `base44.` references outside archived docs
- [ ] `VITE_DATA_BACKEND` removed or hardcoded `supabase` (switch no longer needed)
- [ ] All routes in route-map functional on Vercel production
- [ ] Supabase RLS enforces tenant isolation without app-level checks
- [ ] NFC, QR, OCR, offline sync pass production smoke suite
- [ ] Admin access via Supabase Auth roles only
- [ ] Clean demo data seeded in Supabase (Phase 7.5; no Base44 import)
- [ ] `boothbridge-base44-final` tag preserved for historical reference

---

## 10. Related Documents

- [Architecture Audit](./architecture-audit.md)
- [Migration Readiness Report](./migration-readiness-report.md)
- [Base44 Dependency Map](./base44-dependency-map.md)
- [Route Map](./route-map.md)
- [Entity Relationship Diagram](./entity-relationship-diagram.md)
- [**Phase 7 — Complete Supabase Transition**](./phase7-complete-supabase-transition.md) — **active implementation roadmap**
- [**Phase 7.3 — Base44 Dependency Audit**](./phase7-base44-dependency-audit.md)
- [Phase 6 Master Execution Plan](./phase6-master-execution-plan.md) — closed; data waiver
