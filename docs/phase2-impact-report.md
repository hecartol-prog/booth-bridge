# Phase 2 — Impact Report

**Date:** 2026-06-13  
**Phase:** 2 — Mechanical Import Refactor (planned, not yet executed)  
**Prerequisite:** Phase 1 complete ([phase1-foundation-report.md](./phase1-foundation-report.md))  
**Default backend during Phase 2:** `VITE_DATA_BACKEND=base44` (unchanged)

---

## 1. Executive Summary

Phase 2 is a **mechanical refactor**: replace direct `@/api/base44Client` usage in application code with the Phase 1 foundation clients (`db`, `auth`, `storage`, `ai`). No route changes, no UI changes, no backend switch, and no Supabase activation.

**Scope:** ~**65 application files** (~**280+ call sites**) across pages, layout, auth, hooks, and utilities.

**Risk level:** **Medium** — high file count but low logic change; regression risk concentrated in auth OTP flow, realtime subscriptions, and mixed dbClient/base44 files.

**Outcome when complete:** Zero `base44` imports outside `src/api/*` foundation layer and `src/utils/dbClient.js` (which delegates internally).

---

## 2. Phase 2 Objectives

| Do | Do not |
|----|--------|
| Replace `base44.entities.*` → `db.*` | Switch `VITE_DATA_BACKEND` to supabase |
| Replace `base44.auth.*` → `auth.*` | Change AuthContext behavior beyond import path |
| Replace `integrations.Core.UploadFile` → `storage.uploadFile` | Modify JSX, CSS, or layouts |
| Replace `InvokeLLM` / `ExtractDataFromUploadedFile` → `ai.*` | Touch NFC/QR/offline queue **logic** |
| Replace `functions.invoke("adminAuth")` → `auth.adminLogin` | Remove `@base44/sdk` from package.json |
| Wire `assetPipeline.js` → `storageClient` | Begin Supabase schema or data migration |

---

## 3. Impact by Abstraction Layer

### 3.1 Database (`db` from `@/utils/dbClient`)

| Metric | Value |
|--------|-------|
| Files with `base44.entities` | **58** |
| Approximate call sites | **~240** |
| Entities referenced | **32 of 39** (see §5) |
| Realtime `subscribe()` | **2 files** (Connections, Meetings) |
| Already partial `db` usage | **5 files** (see §6) |

**Replace pattern:**

```javascript
// Before
import { base44 } from "@/api/base44Client";
await base44.entities.Connection.filter({ ... });

// After
import { db } from "@/utils/dbClient";
await db.Connection.filter({ ... });
```

**Subscribe pattern (unchanged semantics):**

```javascript
// Before
base44.entities.Meeting.subscribe(callback)

// After
db.Meeting.subscribe(callback)
```

---

### 3.2 Authentication (`auth` from `@/api/authClient`)

| Metric | Value |
|--------|-------|
| Files with `base44.auth` | **9** (excluding authClient.js) |
| Approximate call sites | **~22** |

| File | Auth calls |
|------|------------|
| `src/lib/AuthContext.jsx` | `me`, `logout`, `redirectToLogin` + axios public-settings* |
| `src/pages/Login.jsx` | `loginViaEmailPassword`, `loginWithProvider` ×2 |
| `src/pages/Register.jsx` | `register`, `verifyOtp`, `setToken`, `resendOtp`, `loginWithProvider` |
| `src/pages/ForgotPassword.jsx` | `resetPasswordRequest` |
| `src/pages/ResetPassword.jsx` | `resetPassword` |
| `src/pages/Onboarding.jsx` | `me`, `updateMe` ×2 |
| `src/pages/Profile.jsx` | auth-related updates |
| `src/components/layout/AppLayout.jsx` | `updateMe`, `logout` |
| `src/lib/PageNotFound.jsx` | `me` |
| `src/pages/AdminLogin.jsx` | → `auth.adminLogin` (via functions today) |

\* `AuthContext` also imports `createAxiosClient` from `@base44/sdk/dist/utils/axios-client` for public settings — move behind `auth.checkAppReady()` only; no page change.

**Pre-Phase-2 authClient gaps (must extend before Register/ResetPassword refactor):**

| Method used in app | In authClient today? |
|--------------------|----------------------|
| `verifyOtp({ email, otpCode })` | Partial — needs object signature |
| `setToken(access_token)` | **Missing** |
| `resendOtp(email)` | **Missing** |
| `resetPassword({ resetToken, newPassword })` | **Missing** — only `requestPasswordReset` exists |

---

### 3.3 Storage (`storage` from `@/api/storageClient`)

| Metric | Value |
|--------|-------|
| Files with `base44.integrations` (upload/signed URL) | **10** (excluding clients) |
| Approximate call sites | **~16** |

| File | Integration calls |
|------|-------------------|
| `src/utils/assetPipeline.js` | `UploadFile`, `CreateFileSignedUrl` |
| `src/pages/OCRScanner.jsx` | `UploadFile` |
| `src/pages/Onboarding.jsx` | `UploadFile` ×2 |
| `src/pages/Products.jsx` | `UploadFile` |
| `src/pages/CatalogLibrary.jsx` | `UploadFile` |
| `src/pages/ExhibitorSetupWizard.jsx` | `UploadFile` ×3 |
| `src/pages/admin/AdminCatalogues.jsx` | `UploadFile` ×2 |
| `src/pages/admin/AdminMedia.jsx` | `UploadFile` |
| `src/pages/admin/AdminExhibitors.jsx` | `UploadFile` |

**Replace pattern:**

```javascript
// Before
const { file_url } = await base44.integrations.Core.UploadFile({ file });

// After
const { file_url } = await storage.uploadFile(file);
```

`assetPipeline.js` becomes the only non-page consumer of `storageClient` for signed URLs — pages keep calling `getSignedUrl()` from assetPipeline.

---

### 3.4 AI (`ai` from `@/api/aiClient`)

| Metric | Value |
|--------|-------|
| Files with LLM / extract calls | **3** |
| Approximate call sites | **~4** |

| File | Calls |
|------|-------|
| `src/pages/OCRScanner.jsx` | `UploadFile` + `InvokeLLM` → split storage + `ai.invokeLLM` or `extractBusinessCard` / `extractBadge` |
| `src/pages/Onboarding.jsx` | `ExtractDataFromUploadedFile` → `ai.extractFromUploadedFile` |
| `src/components/AiBoothAssistant.jsx` | `InvokeLLM` → `ai.boothAssistantChat` or `ai.invokeLLM` |

**Constraint:** OCR **workflow and UI unchanged** — only import/call path changes.

---

### 3.5 Admin function

| File | Call |
|------|------|
| `src/pages/AdminLogin.jsx` | `base44.functions.invoke("adminAuth", ...)` → `auth.adminLogin(email, password)` |

---

## 4. Complete File Inventory

### 4.1 Pages — must refactor (**58 files**)

All files under `src/pages/` currently importing `@/api/base44Client`:

**Auth & onboarding (7)**  
`Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `Onboarding.jsx`, `Profile.jsx`, `AdminLogin.jsx`

**Buyer flows (12)**  
`BuyerDashboard.jsx`, `ScanQR.jsx`, `DigitalBooth.jsx`, `SavedBooths.jsx`, `MyLibrary.jsx`, `MyRFIs.jsx`, `ExhibitorDiscover.jsx`, `Discover.jsx`, `EventsDirectory.jsx`, `EventDirectory.jsx`, `ScannedContacts.jsx`, `OCRScanner.jsx`

**Exhibitor flows (11)**  
`ExhibitorDashboard.jsx`, `Connections.jsx`, `RFIInbox.jsx`, `Products.jsx`, `Catalogue.jsx`, `CatalogLibrary.jsx`, `BusinessCard.jsx`, `Meetings.jsx`, `LeadIntelligence.jsx`, `ExhibitorAnalytics.jsx`, `ExhibitorSetupWizard.jsx`

**NFC (3)** — import swap only, **no logic edits**  
`NFCExchange.jsx`, `NFCProfileView.jsx`, `NFCOrganizerPanel.jsx`

**Organizer / billing (6)**  
`OrganizerAnalytics.jsx`, `OrganizerCommandCenter.jsx`, `PremiumBooth.jsx`, `BillingCenter.jsx`, `IntegrationHub.jsx`, `LeadScoring.jsx`

**Admin (22)**  
`AdminDashboard.jsx`, `AdminUsers.jsx`, `AdminExhibitors.jsx`, `AdminProducts.jsx`, `AdminCatalogues.jsx`, `AdminEvents.jsx`, `AdminConnections.jsx`, `AdminRevenue.jsx`, `AdminLeads.jsx`, `AdminMedia.jsx`, `AdminDataQuality.jsx`, `AdminAuditLog.jsx`, `AdminSupportTickets.jsx`, `AdminNFCValidation.jsx`, `AdminGlobalSearch.jsx`, `AdminStressTest.jsx`, `AdminMonitoring.jsx`, `AdminOCRReview.jsx`, `EventReadinessCenter.jsx`, `LiveEventControlRoom.jsx`, `EventSupportCenter.jsx`

**Orphan pages (still import base44 — refactor for consistency)**  
`Discover.jsx`, `EventsDirectory.jsx`, `LeadScoring.jsx` (no routes in `App.jsx`)

---

### 4.2 Non-page application files (**7 files**)

| File | Layer | Notes |
|------|-------|-------|
| `src/lib/AuthContext.jsx` | auth | Central auth bootstrap |
| `src/lib/PageNotFound.jsx` | auth | Optional `me()` check |
| `src/components/layout/AppLayout.jsx` | auth + entities | Notifications query uses entities |
| `src/components/AiBoothAssistant.jsx` | ai | |
| `src/hooks/useOfflineSync.js` | db | **Offline sync — call path only** |
| `src/utils/activityTracker.js` | db | Use `saveActivity` helper |
| `src/utils/assetPipeline.js` | storage | |

---

### 4.3 Files excluded from refactor (foundation)

These **keep** internal `base44` imports:

| File | Reason |
|------|--------|
| `src/api/base44Client.js` | SDK singleton |
| `src/api/authClient.js` | Base44 delegate |
| `src/api/storageClient.js` | Base44 delegate |
| `src/api/aiClient.js` | Base44 delegate |
| `src/utils/dbClient.js` | Base44 delegate |
| `src/config/backend.js` | Config only |
| `src/api/supabaseClient.js` | Inactive until Phase 4 |

---

### 4.4 Files with no Phase 2 changes

| Category | Files |
|----------|-------|
| Routes | `App.jsx` |
| Offline queues | `offlineScanQueue.js`, `visitorInteractionQueue.js`, `visitorCache.js` |
| QR / NFC components | `QRGenerator.jsx`, `NFCProfileCard.jsx`, `QRCameraScanner.jsx` (unused) |
| Pure utils | `leadScoring.js`, `securitySanitizer.js`, `followUpChecker.js`, `venueTimezone.js`, `csvExport.js`, `adminExport.js` |
| Already on dbClient only | `SupplierCompare.jsx`, `CreateProjectSheet.jsx` |
| No base44 usage found | `AdminSettings.jsx`, `Home.jsx`, `QRCode.jsx`, UI components |

---

## 5. Entity Touch Matrix

Entities referenced via `base44.entities` in application code (Phase 2 will use `db.*`):

| Entity | Files | Phase 1 on `db`? |
|--------|-------|------------------|
| Connection | 18+ | Yes |
| ExhibitorProfile | 20+ | Yes |
| Meeting | 12+ | Yes |
| RFI | 10+ | Yes |
| Product | 12+ | Yes |
| CatalogItem | 12+ | Yes |
| Event | 10+ | Yes |
| BuyerProfile | 8+ | Yes |
| Notification | 8+ | Yes |
| SavedBooth | 8+ | Yes |
| SavedProduct | 6+ | Yes |
| LeadProfile | 6+ | Yes |
| NFCProfile | 6+ | Yes |
| LeadInteraction | 4+ | Yes |
| ScannedContact | 4+ | Yes |
| User | 4+ | Yes |
| NFCInteraction | 4+ | Yes |
| IntegrationConnection | 2 | Yes |
| IntegrationSyncLog | 1 | Yes |
| Activity | 2 | Yes |
| BillingSubscription | 1 | Yes |
| BillingTransaction | 2 | Yes |
| PremiumBoothSubscription | 2 | Yes |
| SponsoredListing | 2 | Yes |
| SupportTicket | 2 | Yes |
| AdminAccessLog | 2 | Yes |
| StressTestResult | 1 | Yes |
| SystemAlert | 1 | Yes |
| NFCProductTag | 2 | Yes |
| Media | 2 | Yes |

**Not referenced in app code today (no Phase 2 page changes):**  
`Company`, `Booth`, `MatchRecommendation`, `OpportunityPost`, `MeetingRequest`, `LeadIntelligence`, `VerificationProfile`, `SourcingProject`* , `ProjectSupplierMapping`*

\* Used via `dbClient` helpers in `SupplierCompare`, `BuyerDashboard`, `DigitalBooth`, `CreateProjectSheet` — already on `db`.

---

## 6. Mixed dbClient + base44 Files

These files already import `dbClient` but still call `base44` directly — **highest careful-merge priority**:

| File | db usage | base44 usage |
|------|----------|--------------|
| `DigitalBooth.jsx` | `addSupplierToProject` | entities ×11 |
| `BuyerDashboard.jsx` | `db.SourcingProject` | entities ×6 |
| `PremiumBooth.jsx` | `db` import | entities ×7 |

Phase 2 should remove redundant `base44Client` import from these files entirely.

---

## 7. Feature-Sensitive Areas (no logic changes)

Per migration constraints, these areas receive **import substitution only**:

| Feature | Files | Call sites | Risk |
|---------|-------|------------|------|
| **QR scan → connection** | `ScanQR.jsx`, `useOfflineSync.js` | 15 | Medium — duplicate connection guard must behave identically |
| **Offline sync** | `useOfflineSync.js` | 11 | Medium — silent catch blocks hide regressions |
| **NFC profile + taps** | `NFCExchange.jsx`, `NFCProfileView.jsx`, `NFCOrganizerPanel.jsx` | 13 | Low if entities map 1:1 |
| **OCR pipeline** | `OCRScanner.jsx`, `Onboarding.jsx` | 5 | Medium — authClient gaps N/A; storage+ai split |
| **Realtime** | `Connections.jsx`, `Meetings.jsx` | 2 | Medium — verify unsubscribe still works |
| **Register OTP** | `Register.jsx` | 5 | **High** — extend authClient first |

---

## 8. Recommended Execution Order

Execute in batches with `npm run build` + smoke test after each batch.

| Batch | Files | Est. count |
|-------|-------|------------|
| **0 — authClient extensions** | Add `setToken`, `resendOtp`, `resetPassword`, object `verifyOtp` | 1 file |
| **1 — utilities & hooks** | `activityTracker`, `assetPipeline`, `useOfflineSync` | 3 |
| **2 — auth core** | `AuthContext`, `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `AdminLogin`, `PageNotFound` | 7 |
| **3 — layout** | `AppLayout` | 1 |
| **4 — admin pages** | All `src/pages/admin/*` + ops pages | 25 |
| **5 — buyer + exhibitor core** | Dashboards, Connections, RFI, Meetings, Products, Catalog | 20 |
| **6 — NFC + QR + OCR** | ScanQR, NFC*, OCRScanner, ScannedContacts | 7 |
| **7 — mixed + orphan** | DigitalBooth, BuyerDashboard, PremiumBooth, orphans | 6 |
| **8 — AI component** | `AiBoothAssistant` | 1 |

**Estimated total touched:** ~65 files (+1 authClient extension)

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Register OTP / setToken API mismatch | **High** | Extend authClient in Batch 0; test full register flow |
| Realtime subscribe breakage | **Medium** | Manual test Connections + Meetings live update |
| Mixed db/base44 files incomplete swap | **Medium** | grep gate: zero `base44` in pages after Phase 2 |
| OCR upload + LLM split | **Medium** | Keep sequential await order identical in OCRScanner |
| Offline sync regression | **Medium** | Test offline scan → online sync before sign-off |
| AdminLogin response shape | **Low** | `auth.adminLogin` must return `{ data: { success } }` compatible shape |
| Accidental UI diff | **Low** | No JSX edits rule; review diffs for formatting-only churn |
| Build bundle change | **Low** | Expect negligible change while still on Base44 delegate |

---

## 10. Rollback Strategy

| Trigger | Action |
|---------|--------|
| Build failure | Revert batch commit |
| Auth regression | Revert Batch 2; keep utility batch if isolated |
| QR/offline failure | Revert Batch 6 only |
| Full Phase 2 rollback | Reset branch to Phase 1 tag / commit |

**Production:** No deployment required for Phase 2 if CI passes on `base44` backend — behavior should be identical.

---

## 11. Validation Checklist (Phase 2 sign-off)

### Automated gates

- [ ] `npm run build` — exit 0
- [ ] `grep -r "from.*base44Client" src/pages src/components src/hooks src/lib` → **0 matches** (except none expected)
- [ ] `grep -r "base44\." src/pages src/components src/hooks src/lib` → **0 matches**
- [ ] `VITE_DATA_BACKEND` unset or `base44`

### Manual smoke (Phase 0 parity)

- [ ] Login email + Google + LinkedIn
- [ ] Register + OTP + resend OTP
- [ ] Forgot / reset password
- [ ] Onboarding exhibitor + buyer (+ card scan if used)
- [ ] QR scan online → DigitalBooth → connection
- [ ] QR scan offline → reconnect → sync (`useOfflineSync`)
- [ ] NFC profile save + public `/nfc/:userId`
- [ ] OCR business card + badge → contacts list
- [ ] RFI send (buyer) + reply (exhibitor)
- [ ] Meeting propose + accept + realtime update
- [ ] Admin login + dashboard
- [ ] Catalog upload + download
- [ ] AI booth assistant message

---

## 12. Effort Estimate

| Activity | Estimate |
|----------|----------|
| authClient extensions | 2–4 hours |
| Mechanical entity swap | 8–12 hours |
| Auth + AuthContext wiring | 4–6 hours |
| Storage + AI wiring | 3–4 hours |
| Mixed files + cleanup | 2–3 hours |
| Regression testing | 4–8 hours |
| **Total** | **~3–5 engineer-days** |

---

## 13. Remaining Work After Phase 2 (Phase 3+)

| Phase | Work |
|-------|------|
| **3** | Supabase schema, RLS, Storage buckets, Edge Functions |
| **4** | Implement Supabase branches in db/auth/storage/ai clients |
| **5** | Auth cutover + admin session unification |
| **6** | Data import Base44 → Supabase |
| **7** | Remove `@base44/sdk`, `@base44/vite-plugin`, `base44Client.js` |
| **8** | Vercel production deployment |

---

## 14. Related Documents

- [Phase 1 Foundation Report](./phase1-foundation-report.md)
- [Migration Execution Roadmap](./migration-execution-roadmap.md)
- [Base44 Dependency Map](./base44-dependency-map.md)
- [Future Data Model](./future-data-model.md)
