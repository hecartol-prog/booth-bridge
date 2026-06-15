# BoothBridge Architecture Audit

**Repository:** `booth-bridge`  
**Audit date:** 2026-06-13  
**Branch analyzed:** `migration/base44-independence`  
**Platform:** Base44-hosted SPA (React 18 + Vite 6)

---

## Executive Summary

BoothBridge is a trade-show networking application for exhibitors, buyers, and organizers. It is built as a **single-page React application** deployed through the **Base44 platform**. All persistence, authentication, file storage, serverless functions, and LLM/OCR capabilities are provided by Base44 SDK (`@base44/sdk` v0.8.32) and the `@base44/vite-plugin`.

A partial **migration abstraction layer** exists in `src/utils/dbClient.js` and `src/utils/assetPipeline.js`, intended to swap Base44 for Supabase without changing page components—but **most pages still call `base44` directly**.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| UI framework | React 18.2 |
| Build | Vite 6.1, `@vitejs/plugin-react` |
| Routing | React Router DOM 6.26 |
| State / data fetching | TanStack React Query 5.84 |
| Styling | Tailwind CSS 3.4, Radix UI primitives |
| Charts | Recharts |
| Maps | react-leaflet |
| Forms | react-hook-form, Zod |
| i18n | Custom `I18nProvider` (7 locale JSON files) |
| Payments (declared) | `@stripe/react-stripe-js`, `@stripe/stripe-js` (UI only; no live Stripe integration in code) |
| Backend | Base44 (entities, auth, integrations, functions) |
| Offline | IndexedDB + localStorage queues, Service Worker (`public/sw.js`) |

---

## Application Structure

```
booth-bridge/
├── base44/                    # Platform schema & serverless function definitions
│   ├── entities/*.jsonc       # 39 entity schemas
│   ├── functions/adminAuth/   # Deno admin credential check
│   └── config.jsonc
├── public/
│   └── sw.js                  # Production service worker (static asset cache)
├── src/
│   ├── api/base44Client.js    # SDK client singleton
│   ├── components/            # UI, layout, feature components
│   ├── hooks/useOfflineSync.js
│   ├── lib/                   # AuthContext, i18n, query-client, app-params
│   ├── locales/               # en, de, es, fr, it, ru, zh
│   ├── pages/                 # 65 page components (+ admin subdirectory)
│   └── utils/                 # dbClient, offline queues, scoring, sanitization
└── vite.config.js             # Base44 vite plugin enabled
```

---

## Authentication Architecture

BoothBridge uses **two independent authentication systems** that do not share sessions.

### 1. User Authentication (Base44 Auth)

| Aspect | Implementation |
|--------|----------------|
| Provider | `base44.auth` via `@base44/sdk` |
| Token storage | `localStorage` keys managed by SDK (`base44_access_token`, `token`) |
| App params | `src/lib/app-params.js` — `app_id`, `access_token`, `functions_version`, `app_base_url` from URL or `VITE_*` env |
| Bootstrap | `AuthContext` calls `/api/apps/public/prod/public-settings/by-id/{appId}` then `base44.auth.me()` |
| Login methods | Email/password (`loginViaEmailPassword`), Google OAuth, LinkedIn OAuth |
| Registration | `base44.auth.register` + OTP verification flow in `Register.jsx` |
| Password reset | `base44.auth.resetPasswordRequest` / reset token flow |
| Logout | `base44.auth.logout()` |
| Route guard | `ProtectedRoute` — requires `isAuthenticated` from AuthContext |
| Onboarding gate | `OnboardedGuard` — redirects to `/onboarding` if `!user.onboarded` or missing `user_role` (admin and impersonation bypass) |
| User roles | `user_role`: `exhibitor`, `buyer`; `role`: `user`, `admin` (platform role) |
| Admin impersonation | `localStorage.bb_impersonate_as_user` toggles buyer/exhibitor view for admins |

### 2. Admin Panel Authentication (Custom)

| Aspect | Implementation |
|--------|----------------|
| Login page | `/admin-login` — separate from user login |
| Credential check | `base44.functions.invoke("adminAuth", { email, password })` |
| Server function | `base44/functions/adminAuth/entry.ts` — compares against `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars |
| Session | `sessionStorage.bb_admin_authed = "true"` (not tied to Base44 user token) |
| Route guard | `AdminLayout` — redirects to `/admin-login` if session flag missing |
| Brute-force protection | Client-side lockout after 5 failures (5-minute lock, sessionStorage) |
| Audit | `AdminAccessLog` entity writes on login success/failure |
| MFA / SSO | UI placeholders only — not implemented |

**Critical gap:** Admin panel access does not verify Base44 `role === admin`. Any user who obtains admin credentials gains full admin UI access regardless of app user role.

---

## Database Architecture

### Platform

All application data lives in **Base44 entity collections** (document/NoSQL-style, accessed via SDK). There is no direct Postgres/Supabase connection in the application code today.

- **App ID:** `6a1efdb97246f738e8422e59` (`base44/.app.jsonc`)
- **Entity count:** 39 defined schemas
- **RLS:** Row-level security rules defined per entity in JSONC (not enforced in application layer)
- **IDs:** UUID-style strings (client-side `generateUUID()` in dbClient for portability)
- **Timestamps:** `created_date`, `updated_date` (platform-managed)

### Abstraction Layer (`dbClient.js`)

`makeEntity()` wraps `base44.entities[name]` with `list`, `filter`, `get`, `create`, `update`, `delete`, `subscribe`.

**25 entities exported** in `db` object. **14 entities** are used only via direct `base44.entities` calls.

Typed mutation helpers: `saveConnection`, `saveActivity`, `createRFI`, `sendNotification`, `saveBooth`, `saveProduct`, sourcing project helpers.

### Real-time

`base44.entities.*.subscribe()` used for:
- `Connection` (Connections page)
- `Meeting` (Meetings page)

No WebSocket abstraction beyond Base44 SDK subscriptions.

---

## Storage Architecture

### File Upload & Access

| Operation | Base44 Integration |
|-----------|-------------------|
| Upload | `base44.integrations.Core.UploadFile({ file })` → `{ file_url }` |
| Signed URL | `base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in })` |
| OCR extract | `base44.integrations.Core.ExtractDataFromUploadedFile` (onboarding) |
| LLM | `base44.integrations.Core.InvokeLLM` (OCR, AI assistant, onboarding) |

### Asset Pipeline (`src/utils/assetPipeline.js`)

Planned folder schema for Supabase migration:

```
boothbridge-assets/
├── events/[event_id]/branding/
└── companies/[company_id]/catalogs/
```

- `uploadAsset()` — upload via Base44
- `getSignedUrl()` — 15-minute signed URLs; legacy `http` URLs returned as-is
- `downloadCatalog()` — opens signed URL, optional download count callback
- `buildAssetRegistryEntry()` — metadata shape for future Postgres registry

### Static Assets

- Logo and media hosted on `media.base44.com`
- Production SW caches static assets; **explicitly skips** `/api/` and `base44` hostnames

### Client-Side Caches

| Mechanism | Purpose | TTL |
|-----------|---------|-----|
| `visitorCache.js` | Page data snapshots (events, exhibitors) | 24 hours |
| `offlineScanQueue.js` | IndexedDB `scan_queue` + localStorage fallback | Until synced |
| `visitorInteractionQueue.js` | IndexedDB `visitor_interactions` | Until synced |
| Service Worker | Static asset cache-first | Version `boothbridge-v1` |

---

## API Architecture

### Request Flow

```
Browser → Vite dev proxy / Base44 hosting
         → /api/apps/public/*     (app settings, auth bootstrap)
         → Base44 entity REST     (via SDK base44.entities.*)
         → Base44 integrations    (via SDK base44.integrations.Core.*)
         → Base44 functions       (via SDK base44.functions.invoke)
```

### Client Configuration (`base44Client.js`)

```javascript
createClient({
  appId, token, functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
})
```

`requiresAuth: false` at client level — auth enforced per-request by platform and `ProtectedRoute`.

### Serverless Functions

| Function | Path | Runtime | Purpose |
|----------|------|---------|---------|
| `adminAuth` | `base44/functions/adminAuth/entry.ts` | Deno | Admin email/password validation |

No other custom Base44 functions in repository.

### External API Integrations (UI / Data Model Only)

`IntegrationHub` defines providers: Calendly, Google Calendar, Outlook, Salesforce, HubSpot (+ coming soon: Teams, Zoom, LinkedIn).

- Data stored in `IntegrationConnection` and `IntegrationSyncLog` entities
- **Connect button is a placeholder** — no OAuth flow implemented
- Toggle active/disconnect updates entity records only

---

## NFC Architecture

NFC is implemented as **URL-based profile exchange**, not hardware Web NFC API.

| Component | Role |
|-----------|------|
| `NFCProfile` entity | Per-user NFC profile (display fields, `nfc_identifier`, `profile_url`, tap counts) |
| `NFCInteraction` entity | Tap/badge interaction log |
| `NFCProductTag` entity | Product-linked NFC tags for organizers |
| `/nfc` (`NFCExchange.jsx`) | User manages NFC profile, views interactions |
| `/nfc/:userId` (`NFCProfileView.jsx`) | **Public** profile landing (badge tap target) |
| `/nfc-admin` (`NFCOrganizerPanel.jsx`) | Organizer panel for profiles and product tags |
| `/admin/nfc-validation` | Admin validation UI for tags and profiles |

**Profile URL pattern:** `{origin}/nfc/{user_id}`  
**NFC identifier:** `bb-nfc-{userId}-{timestamp}` on create

Hardware NFC tags are assumed to encode the profile URL. No `navigator.nfc` usage.

---

## QR Architecture

| Component | Role |
|-----------|------|
| `QRGenerator.jsx` | Custom canvas QR encoder (not a third-party library) |
| `/qr` (`QRCode.jsx`) | Display user's connection QR |
| `/scan` (`ScanQR.jsx`) | Camera scan (BarcodeDetector API) + manual entry |
| QR payload | `boothbridge:connect:{userId}:{role}` |
| Validation | `validateQRPayload()` in `securitySanitizer.js` |
| Post-scan flow | Opens `DigitalBooth.jsx` embedded view; creates `Connection` (buyer auto-accept) |
| Offline | `enqueueScan()` → sync via `useOfflineSync` |

`QRCameraScanner.jsx` exists as alternate scanner component but is **not imported** anywhere (unused).

---

## OCR Architecture

OCR is **LLM-based vision extraction**, not a dedicated OCR service.

| Flow | Implementation |
|------|----------------|
| User scan | `/ocr-scanner` — upload/capture image |
| Upload | `UploadFile` integration |
| Extract | `InvokeLLM` with structured JSON schema (business card or badge prompts) |
| Sanitize | `sanitizeOCRResult()`, `validateFieldPattern()` |
| Persist | `ScannedContact` entity |
| Admin review | `/admin/ocr-review` — list/update scanned contacts |
| Onboarding OCR | `Onboarding.jsx` — `ExtractDataFromUploadedFile` for business card during signup |

Scan types: `business_card`, `badge` (event badge).

---

## Offline Sync Architecture

```
┌─────────────────┐     online      ┌──────────────────┐
│  ScanQR /       │ ───────────────►│ base44.entities  │
│  DigitalBooth   │                 │ Connection, etc. │
└────────┬────────┘                 └──────────────────┘
         │ offline
         ▼
┌─────────────────┐     online      ┌──────────────────┐
│ IndexedDB       │ ───────────────►│ useOfflineSync   │
│ scan_queue      │   useOfflineSync│ syncScans()      │
│ visitor_inter-  │                 │ syncVisitorActions│
│ actions         │                 └──────────────────┘
└─────────────────┘
         │ fallback
         ▼
    localStorage
```

**Synced actions:**
- QR scans → `Connection` + `Notification`
- Save booth → `SavedBooth`
- Save product → `SavedProduct`
- Download catalog → `CatalogItem.download_count`
- Submit RFI → `RFI` + `Notification`

**Triggers:** `navigator.onLine`, mount of `useOfflineSync` hook (used in `ScanQR.jsx`).

**Not queued offline:** Meetings, NFC interactions, OCR uploads, admin operations, integration syncs.

`OfflineBanner.jsx` provides UI indicator; `visitorCache.js` provides read-only stale data for some directory pages.

---

## Integration Architecture

### CRM / Calendar (Planned)

Entity-backed configuration with no live OAuth:

- `IntegrationConnection` — provider, status, scopes, sync stats
- `IntegrationSyncLog` — per-sync audit trail
- `LeadIntelligence` — `crm_synced_salesforce`, `crm_synced_hubspot`, external IDs

### Activity Tracking

`activityTracker.js` — fire-and-forget `Activity` entity writes with point values per `activity_type`.

### AI Assistant

`AiBoothAssistant.jsx` on `DigitalBooth` — contextual `InvokeLLM` with exhibitor profile, products, catalogs.

### Billing (Display Only)

`BillingCenter.jsx` reads `BillingSubscription` and `BillingTransaction`. Plan cards show "Pay with Stripe" but **no Stripe Checkout or PaymentIntent code** exists. `@stripe/*` packages are installed but unused in source.

---

## User Role Surfaces

| Role | Primary surfaces |
|------|------------------|
| Buyer | Dashboard, scan, saved booths/products, RFIs, workspace/compare, discover, OCR, contacts |
| Exhibitor | Dashboard, connections, RFI inbox, products, catalog library, lead intelligence, analytics, premium booth |
| Organizer (feature flags) | Organizer analytics, command center, NFC admin panel |
| Admin (separate auth) | Full `/admin/*` control center |

Navigation is role-split in `AppLayout.jsx` (`exhibitorNav` vs `buyerNav`).

---

## Deployment & Environment

| Variable | Purpose |
|----------|---------|
| `VITE_BASE44_APP_ID` | Application ID |
| `VITE_BASE44_FUNCTIONS_VERSION` | Serverless function version |
| `VITE_BASE44_APP_BASE_URL` | App base URL for SDK |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin function credentials (server-side) |
| `BASE44_LEGACY_SDK_IMPORTS` | Vite plugin legacy import mode |

Build output: `dist/` (configured in `base44/config.jsonc`).

---

## Key Architectural Risks (Summary)

See `migration-readiness-report.md` for full analysis.

1. **Dual auth systems** — admin session independent of Base44 user auth
2. **Direct Base44 coupling** — ~70+ files import `base44` directly; `dbClient` partially adopted
3. **Base44 integrations dependency** — Upload, LLM, signed URLs have no local fallback
4. **Placeholder integrations** — CRM/calendar connect flows not implemented
5. **Entity duplication** — overlapping profile/lead/meeting/billing models
6. **Unused schema entities** — `Company`, `Booth`, `MatchRecommendation`, `OpportunityPost`, `MeetingRequest`, `VerificationProfile` have little or no UI usage

---

## Related Documents

- [Route Map](./route-map.md)
- [Entity Relationship Diagram](./entity-relationship-diagram.md)
- [Base44 Dependency Map](./base44-dependency-map.md)
- [Migration Readiness Report](./migration-readiness-report.md)
