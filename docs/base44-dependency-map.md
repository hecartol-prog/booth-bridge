# Base44 Dependency Map

> **Superseded for active work by:** [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md) (2026-07-01)  
> This document remains the original pre-Phase-2 SDK surface area reference.

**Generated:** 2026-06-13  
**SDK:** `@base44/sdk` ^0.8.32  
**Vite plugin:** `@base44/vite-plugin` ^1.0.21  
**App ID:** `6a1efdb97246f738e8422e59`

---

## Dependency Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
├─────────────────────────────────────────────────────────────┤
│  Pages (direct base44)  │  dbClient / assetPipeline (proxy) │
├─────────────────────────┴─────────────────────────────────┤
│              src/api/base44Client.js                         │
│              createClient({ appId, token, ... })             │
├─────────────────────────────────────────────────────────────┤
│  base44.auth          base44.entities.*    base44.integrations│
│  base44.functions     (subscribe)          base44.integrations.Core│
├─────────────────────────────────────────────────────────────┤
│  @base44/vite-plugin (dev proxy, HMR, analytics)             │
│  /api/apps/public/*   Entity API    Integration API          │
│  Serverless functions (adminAuth)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Package Dependencies

| Package | Role |
|---------|------|
| `@base44/sdk` | Client SDK — auth, entities, integrations, functions |
| `@base44/vite-plugin` | Dev server integration, legacy import support, HMR notifiers |
| `@base44/sdk/dist/utils/axios-client` | Direct axios client for public settings (`AuthContext`) |

---

## Client Initialization

**File:** `src/api/base44Client.js`

| Config key | Source |
|------------|--------|
| `appId` | `VITE_BASE44_APP_ID` or URL `app_id` |
| `token` | URL `access_token` or localStorage |
| `functionsVersion` | `VITE_BASE44_FUNCTIONS_VERSION` |
| `appBaseUrl` | `VITE_BASE44_APP_BASE_URL` |
| `serverUrl` | `''` (platform default) |
| `requiresAuth` | `false` |

**File:** `src/lib/app-params.js` — persists params to `localStorage` with `base44_*` keys.

---

## SDK Surface Area Usage

### `base44.auth`

| Method | Used in |
|--------|---------|
| `me()` | `AuthContext.jsx`, `PageNotFound.jsx` |
| `logout()` | `AuthContext.jsx`, `AppLayout.jsx` |
| `redirectToLogin()` | `AuthContext.jsx` |
| `loginViaEmailPassword()` | `Login.jsx` |
| `loginWithProvider("google")` | `Login.jsx` |
| `loginWithProvider("linkedin")` | `Login.jsx` |
| `register()` | `Register.jsx` |
| `resetPasswordRequest()` | `ForgotPassword.jsx` |
| `updateMe()` | `AppLayout.jsx` (role switch), `Onboarding.jsx` |

**Migration target:** Supabase Auth (or custom JWT) + user metadata table.

---

### `base44.entities.*`

#### By entity — direct `base44.entities` usage in `src/`

| Entity | Files using direct access | Also in dbClient? |
|--------|---------------------------|-------------------|
| Activity | IntegrationHub, activityTracker | Yes |
| AdminAccessLog | AdminAuditLog, AdminLogin | No |
| BillingSubscription | BillingCenter | No |
| BillingTransaction | BillingCenter, AdminDashboard | No |
| BuyerProfile | BusinessCard, ExhibitorDashboard, Onboarding, AdminDashboard, ... | Yes |
| CatalogItem | DigitalBooth, Catalogue, CatalogLibrary, RFIInbox paths, admin pages | Yes |
| Connection | 20+ files (core entity) | Yes |
| Event | EventDirectory, Meetings, admin, organizer pages | Yes |
| ExhibitorProfile | 25+ files | Yes |
| IntegrationConnection | IntegrationHub | Yes |
| IntegrationSyncLog | IntegrationHub | Yes |
| LeadInteraction | ExhibitorDashboard, LeadIntelligence, ExhibitorAnalytics | Yes |
| LeadProfile | AdminLeads, AdminDashboard, AdminDataQuality, AdminGlobalSearch | Yes |
| LeadIntelligence | — (entity unused directly) | Yes |
| Media | Connections, AdminMedia | Yes |
| Meeting | Meetings, Connections, dashboards, organizer pages | Yes |
| MeetingRequest | — (only dbClient helpers) | Yes |
| NFCInteraction | NFCExchange, NFCProfileView, NFCOrganizerPanel | No |
| NFCProductTag | NFCOrganizerPanel, AdminNFCValidation, AdminGlobalSearch | No |
| NFCProfile | NFCExchange, NFCProfileView, NFCOrganizerPanel, AdminNFCValidation, EventSupportCenter | No |
| Notification | 15+ files | Yes |
| PremiumBoothSubscription | PremiumBooth, AdminDashboard | No |
| Product | DigitalBooth, Products, ExhibitorDiscover, admin pages | Yes |
| RFI | RFIInbox, MyRFIs, dashboards, LeadIntelligence | Yes |
| SavedBooth | DigitalBooth, SavedBooths, BuyerDashboard, useOfflineSync, LiveEventControlRoom | Yes |
| SavedProduct | DigitalBooth, MyLibrary, BuyerDashboard, useOfflineSync | Yes |
| ScannedContact | OCRScanner, ScannedContacts, AdminOCRReview | No |
| SponsoredListing | AdminRevenue, OrganizerCommandCenter | No |
| StressTestResult | AdminStressTest | No |
| SupportTicket | AdminSupportTickets, AdminGlobalSearch, EventSupportCenter | No |
| SystemAlert | AdminMonitoring | No |
| User | AdminUsers, AdminDashboard, EventSupportCenter | No |

#### Entities only via `dbClient` (no direct page access to base44)

| Entity | dbClient export | Page usage via db |
|--------|-----------------|-------------------|
| Booth | Yes | **None** |
| Company | Yes | **None** |
| MatchRecommendation | Yes | **None** |
| OpportunityPost | Yes | **None** |
| SourcingProject | Yes | SupplierCompare, CreateProjectSheet, BuyerDashboard |
| ProjectSupplierMapping | Yes | SupplierCompare, DigitalBooth |

#### `subscribe()` usage

| Entity | File |
|--------|------|
| Connection | `Connections.jsx` |
| Meeting | `Meetings.jsx` |

**Migration target:** Supabase Realtime or polling; replicate subscribe in dbClient.

---

### `base44.integrations.Core.*`

| Integration | Method | Files |
|-------------|--------|-------|
| File upload | `UploadFile` | OCRScanner, Onboarding, Products, CatalogLibrary, AdminExhibitors, AdminCatalogues, AdminMedia, ExhibitorSetupWizard, assetPipeline |
| Signed URLs | `CreateFileSignedUrl` | assetPipeline.js |
| LLM / Vision | `InvokeLLM` | OCRScanner, AiBoothAssistant |
| Document extract | `ExtractDataFromUploadedFile` | Onboarding.jsx |

**Migration targets:**
- `UploadFile` → Supabase Storage `upload`
- `CreateFileSignedUrl` → Supabase Storage `createSignedUrl`
- `InvokeLLM` → OpenAI/Anthropic API or Supabase Edge Function
- `ExtractDataFromUploadedFile` → Edge function with vision model

---

### `base44.functions.*`

| Function | Invoke site | Server definition |
|----------|-------------|-------------------|
| `adminAuth` | `AdminLogin.jsx` | `base44/functions/adminAuth/entry.ts` |

**Migration target:** Supabase Edge Function or API route with env-based admin credentials.

---

### Direct HTTP (non-SDK entity path)

| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/apps/public/prod/public-settings/by-id/{appId}` | `AuthContext.jsx` | App bootstrap, auth requirement detection |

**Migration target:** App config endpoint or Supabase-hosted config.

---

## File-Level Import Map

### Files importing `@/api/base44Client` (70 files)

**Core:**
- `src/api/base44Client.js`
- `src/lib/AuthContext.jsx`
- `src/lib/PageNotFound.jsx`
- `src/utils/dbClient.js`
- `src/utils/assetPipeline.js`
- `src/utils/activityTracker.js`
- `src/hooks/useOfflineSync.js`

**Auth pages:** Login, Register, ForgotPassword, ResetPassword, AdminLogin, Onboarding

**App pages:** All major feature pages except those only using dbClient

**Admin pages:** All `src/pages/admin/*`

**Components:** AppLayout, AiBoothAssistant

### Files using `@/utils/dbClient` only (partial abstraction)

| File | db usage |
|------|----------|
| `SupplierCompare.jsx` | SourcingProject, ProjectSupplierMapping, saveEvaluation |
| `DigitalBooth.jsx` | db + direct base44 (mixed) |
| `BuyerDashboard.jsx` | db (SourcingProject) + direct base44 |
| `PremiumBooth.jsx` | db + direct base44 |
| `CreateProjectSheet.jsx` | createSourcingProject |

---

## Base44 Platform Assets (Non-Code)

| Asset | Location / reference |
|-------|---------------------|
| Entity schemas | `base44/entities/*.jsonc` |
| App metadata | `base44/.app.jsonc`, `base44/config.jsonc` |
| Serverless function | `base44/functions/adminAuth/entry.ts` |
| Hosted media | `media.base44.com/images/public/6a1efdb97246f738e8422e59/...` |
| Service worker exclusion | `public/sw.js` skips `base44` hostnames |

---

## Vite Plugin Configuration

**File:** `vite.config.js`

```javascript
base44({
  legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
  hmrNotifier: true,
  navigationNotifier: true,
  analyticsTracker: true,
  visualEditAgent: true
})
```

**Migration:** Remove `@base44/vite-plugin`; configure standard Vite + env for API base URL.

---

## Entity Schema ↔ dbClient Coverage Gap

| In Base44 schema | In dbClient `db` | Gap |
|------------------|------------------|-----|
| 39 entities | 25 entities | 14 entities only accessible via direct SDK |

**Missing from dbClient:** User, AdminAccessLog, BillingSubscription, BillingTransaction, NFCInteraction, NFCProductTag, NFCProfile, PremiumBoothSubscription, ScannedContact, SponsoredListing, StressTestResult, SupportTicket, SystemAlert, VerificationProfile

---

## External Services Routed Through Base44

| Capability | Base44 integration | App feature |
|------------|-------------------|-------------|
| OAuth (Google, LinkedIn) | base44.auth | User login |
| File storage | Core.UploadFile | Images, catalogs, OCR images |
| Signed downloads | Core.CreateFileSignedUrl | Catalog downloads |
| LLM / Vision | Core.InvokeLLM | OCR, AI booth assistant |
| Document AI | Core.ExtractDataFromUploadedFile | Onboarding card scan |
| Email (password reset) | base44.auth.resetPasswordRequest | Forgot password |
| Admin credentials | functions.adminAuth | Admin panel |

No direct Stripe, Salesforce, HubSpot, or Calendly API calls in codebase — all represented as entity records only.

---

## Coupling Severity Matrix

| Area | Coupling | Migration effort |
|------|----------|------------------|
| Entity CRUD | **Critical** — 70+ files | High — dbClient helps if fully adopted |
| User auth | **Critical** | High — full auth rewrite |
| Admin auth | **High** — custom function + session | Medium — replace function |
| File upload | **High** — 10+ upload sites | Medium — assetPipeline exists |
| LLM/OCR | **High** — 3 features | Medium — edge functions |
| Real-time subscribe | **Low** — 2 entities | Low |
| Public settings API | **Medium** — bootstrap only | Low |
| Vite plugin | **Medium** — dev/build | Low once hosting changes |
| Hosted images/logo | **Low** — static URLs | Low — re-host assets |

---

## Recommended Abstraction Completion Order

1. Extend `dbClient.js` to cover all 39 entities
2. Route `useOfflineSync` and `activityTracker` through dbClient
3. Centralize `base44.integrations.Core` in `assetPipeline.js` + new `aiClient.js`
4. Replace `AuthContext` with Supabase auth provider
5. Replace `adminAuth` function with secure edge auth
6. Remove `@base44/vite-plugin` and `base44Client.js`

---

## Related Documents

- [Architecture Audit](./architecture-audit.md)
- [Migration Readiness Report](./migration-readiness-report.md)
