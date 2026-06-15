# Migration Readiness Report

**Generated:** 2026-06-13  
**Target migration:** Base44 → independent stack (Supabase per `dbClient.js` comments)  
**Repository tag:** `boothbridge-base44-final`  
**Working branch:** `migration/base44-independence`

---

## Readiness Scorecard

| Domain | Readiness | Notes |
|--------|-----------|-------|
| Data model documentation | **Good** | 39 JSONC schemas in `base44/entities/` |
| Data access abstraction | **Partial** | `dbClient.js` covers 25/39 entities; ~70 files still use direct SDK |
| Auth migration | **Poor** | Dual auth systems; heavy `base44.auth` coupling |
| Storage migration | **Partial** | `assetPipeline.js` documents target paths |
| Offline sync | **Good** | Self-contained IndexedDB queues; sync logic needs backend swap only |
| Integrations (CRM/calendar) | **N/A** | Not implemented — migration is greenfield |
| NFC / QR / OCR | **Mixed** | Feature-complete on Base44 integrations (LLM/upload) |
| Admin panel | **Poor** | Separate session; env-password function |
| Payments | **N/A** | Stripe packages installed; no payment flow |
| Test coverage | **Poor** | No test suite found in repository |
| i18n | **Good** | 7 locales; independent of Base44 |

**Overall readiness: Medium-Low** — strong domain model and partial abstractions, but widespread direct SDK usage and platform integration dependencies.

---

## Critical Migration Risks

### 1. Widespread Direct Base44 SDK Usage

**Severity: Critical**

~70 source files import `base44` directly. `dbClient.js` was introduced as a swap layer but adoption is incomplete. Migrating only `dbClient` leaves the majority of the app broken.

**Mitigation:** Mechanical refactor — replace `base44.entities.X` with `db.X` across all pages; extend dbClient to all entities first.

---

### 2. Base44 Integrations Platform Lock-In

**Severity: Critical**

Features depend on `base44.integrations.Core`:

| Feature | Integration | User-facing route |
|---------|-------------|-------------------|
| OCR scanner | UploadFile + InvokeLLM | `/ocr-scanner` |
| Onboarding card scan | UploadFile + ExtractDataFromUploadedFile | `/onboarding` |
| AI booth assistant | InvokeLLM | DigitalBooth (embedded) |
| All image/catalog uploads | UploadFile | Products, catalogs, admin media |
| Private catalog download | CreateFileSignedUrl | Catalog flows |

No fallback if integrations are unavailable during migration.

**Mitigation:** Implement `aiClient.js` and complete `assetPipeline.js` Supabase swap before cutover; feature-flag LLM features.

---

### 3. Dual Authentication Architecture

**Severity: Critical**

| System | Mechanism | Risk |
|--------|-----------|------|
| Users | Base44 OAuth + email/password + JWT in localStorage | Must map all users to new auth provider |
| Admins | `adminAuth` Deno function + `sessionStorage` flag | Completely separate; no link to user accounts |

Admin panel does not verify Base44 `role === admin`. Post-migration, admin RBAC must be redesigned.

**Mitigation:** Unify on Supabase Auth with `app_metadata.role`; use RLS for admin; deprecate `bb_admin_authed` session flag.

---

### 4. Row-Level Security Translation

**Severity: High**

RLS rules live in Base44 JSONC schemas, not in application code. Supabase RLS policies must be authored from JSONC `rls` blocks for all 39 tables.

**Mitigation:** Export and translate RLS rules systematically; integration test per entity.

---

### 5. Real-Time Subscriptions

**Severity: Medium**

`Connection.subscribe()` and `Meeting.subscribe()` use Base44 real-time. Supabase Realtime channels need equivalent filters.

---

### 6. ID and Data Export

**Severity: High**

No migration scripts in repo. Base44 entity export procedure unknown. Client generates UUIDs via `generateUUID()` — compatible with Postgres UUID columns.

**Mitigation:** Base44 bulk export or API pagination; validate ID preservation for foreign key integrity.

---

### 7. Denormalized Data Fields

**Severity: Medium**

`event_name`, `company_name`, `buyer_name`, `booth_number` copied across many entities. Postgres normalization vs. preserving denormalization for migration speed.

---

### 8. Service Worker + API Caching

**Severity: Low**

`sw.js` excludes Base44 API hosts. New API domain must be added to exclusion list if SW retained.

---

### 9. Environment & Secrets

**Severity: High**

| Secret | Current location |
|--------|------------------|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Base44 function env |
| `VITE_BASE44_*` | Build env |
| OAuth client IDs | Base44 platform config |

All must be re-provisioned on new stack.

---

## Duplicate Entities & Overlapping Models

### Profile / Contact Duplication

| Store | Fields overlap |
|-------|----------------|
| `ExhibitorProfile.digital_card` | name, email, phone, linkedin, ... |
| `BuyerProfile.digital_card` | same nested schema |
| `NFCProfile` | display_name, email, phone, company, ... |
| `ScannedContact` | full contact record from OCR |
| `BusinessCard.jsx` | edits digital_card on role profile |

**Recommendation:** Consolidate to `ContactProfile` or user metadata + single `DigitalCard` JSONB column.

---

### Lead Model Duplication

| Model | Purpose | Used by |
|-------|---------|---------|
| `Connection` | Live buyer–exhibitor relationship | Core app |
| `LeadProfile` | Admin CRM record | Admin leads pages |
| `LeadInteraction` | Point-based engagement | Dashboards, LeadIntelligence |
| `LeadIntelligence` (entity) | Scored intelligence + CRM sync flags | Schema only; UI computes scores client-side |
| Client `leadScoring.js` | Score algorithm | LeadIntelligence, ExhibitorDashboard |

**Recommendation:** Define canonical "lead" as Connection + aggregated LeadIntelligence view; deprecate standalone LeadProfile or sync from Connection.

---

### Meeting Model Duplication

| Model | Used |
|-------|------|
| `Meeting` | Meetings page, dashboards — **active** |
| `MeetingRequest` | dbClient helpers only — **inactive in UI** |

**Recommendation:** Merge or drop MeetingRequest if Calendly workflow not planned.

---

### Billing Model Duplication

| Model | Purpose |
|-------|---------|
| `BillingSubscription` + `BillingTransaction` | BillingCenter UI |
| `PremiumBoothSubscription` | PremiumBooth page |
| `SponsoredListing` | Revenue / organizer analytics |

**Recommendation:** Single `subscriptions` table with `plan_type` enum.

---

### Booth vs ExhibitorProfile

| Model | Usage |
|-------|-------|
| `ExhibitorProfile` | booth_number, event_name, event_id — **heavily used** |
| `Booth` | Formal booth entity — **schema only, no UI queries** |

**Recommendation:** Either adopt Booth entity in UI or remove from schema.

---

### Company Entity Orphan

`Company` and `VerificationProfile` defined in schema + dbClient but **zero `base44.entities.Company` usage** in application code. Company data lives on `ExhibitorProfile.company_name` and profile fields.

---

## Technical Debt

| Item | Location | Impact |
|------|----------|--------|
| Incomplete dbClient adoption | 70 direct base44 imports | Migration blocker |
| Placeholder integration OAuth | `IntegrationHub.jsx` Connect button | False "connected" UX possible |
| Stripe installed but unused | `package.json`, BillingCenter label | Dead dependency |
| Admin MFA/SSO placeholders | AdminLogin.jsx | Security gap |
| `requiresAuth: false` on SDK client | base44Client.js | Relies entirely on route guards |
| Duplicate nav label keys | AppLayout exhibitor nav | i18n confusion |
| Organizer routes require admin session | OrganizerCommandCenter → /admin/* | Role model confusion |
| IndexedDB version mismatch risk | offlineScanQueue v1, visitorInteractionQueue v2 | Same DB name `boothbridge_offline` |
| Moment + date-fns both installed | package.json | Bundle bloat |
| `name: "base44-app"` in package.json | package.json | Naming debt |
| Easter egg admin link on login | Login.jsx 5-tap logo | Security through obscurity |
| Error swallowing in offline sync | useOfflineSync catch blocks | Silent data loss |
| LLM as OCR engine | OCRScanner | Cost/latency vs dedicated OCR |

---

## Unused Code

### Orphan Pages (no route in App.jsx)

| File | Notes |
|------|-------|
| `src/pages/Discover.jsx` | Duplicate of ExhibitorDiscover |
| `src/pages/EventsDirectory.jsx` | Duplicate of EventDirectory |
| `src/pages/LeadScoring.jsx` | Standalone UI; scoring in utils + LeadIntelligence |

### Unused Components

| File | Notes |
|------|-------|
| `src/components/QRCameraScanner.jsx` | Not imported; ScanQR implements camera inline |

### Unused / Schema-Only Entities

| Entity | Status |
|--------|--------|
| Company | dbClient only |
| Booth | dbClient only |
| MatchRecommendation | dbClient only |
| OpportunityPost | dbClient only |
| MeetingRequest | dbClient helpers only |
| VerificationProfile | Schema only |
| LeadIntelligence (entity) | No direct entity queries in UI |

### Unused npm Dependencies (likely)

| Package | Evidence |
|---------|----------|
| `@stripe/react-stripe-js`, `@stripe/stripe-js` | No Stripe imports in src |
| `three` | No imports found |
| `react-quill` | Verify usage (likely admin rich text) |
| `moment` | Prefer date-fns where used |

---

## Reusable Modules

These modules are **platform-agnostic** or **designed for backend swap** — prioritize preserving during migration.

### High Value — Keep & Extend

| Module | Path | Reuse value |
|--------|------|-------------|
| **dbClient** | `src/utils/dbClient.js` | Central migration seam; extend to all entities |
| **assetPipeline** | `src/utils/assetPipeline.js` | Storage path schema + signed URL gateway |
| **offlineScanQueue** | `src/utils/offlineScanQueue.js` | IndexedDB queue — independent of backend |
| **visitorInteractionQueue** | `src/utils/visitorInteractionQueue.js` | Same |
| **useOfflineSync** | `src/hooks/useOfflineSync.js` | Swap entity calls inside sync functions |
| **leadScoring** | `src/utils/leadScoring.js` | Pure scoring logic |
| **followUpChecker** | `src/utils/followUpChecker.js` | Pure follow-up intelligence |
| **securitySanitizer** | `src/utils/securitySanitizer.js` | QR validation, OCR sanitization |
| **activityTracker** | `src/utils/activityTracker.js` | Point map + fire-and-forget (swap create call) |
| **visitorCache** | `src/utils/visitorCache.js` | Offline read cache |
| **venueTimezone** | `src/utils/venueTimezone.js` | Meeting timezone formatting |
| **csvExport** | `src/utils/csvExport.js` | Lead export |
| **adminExport** | `src/utils/adminExport.js` | Admin data export |

### UI Components — Reusable

| Module | Path |
|--------|------|
| QRGenerator | `src/components/qr/QRGenerator.jsx` |
| NFCProfileCard | `src/components/nfc/NFCProfileCard.jsx` |
| AiBoothAssistant | `src/components/AiBoothAssistant.jsx` (swap LLM call) |
| ActionQueue | `src/components/buyer/ActionQueue.jsx` |
| CreateProjectSheet | `src/components/buyer/CreateProjectSheet.jsx` |
| AdminDataGrid | `src/components/admin/AdminDataGrid.jsx` |
| OfflineBanner | `src/components/OfflineBanner.jsx` |
| ProtectedRoute | `src/components/ProtectedRoute.jsx` (adapt to new auth) |
| AppLayout / AdminLayout | Layout shells — role nav logic reusable |
| i18n system | `src/lib/i18n.jsx` + `src/locales/*` |
| shadcn/ui components | `src/components/ui/*` — full design system |

### Feature Pages — Logic Reusable (data layer swap)

Most `src/pages/*` contain valuable UX flows. Migration effort is primarily replacing data fetching, not rewriting UI.

**Highest complexity pages (migration order late):**
- DigitalBooth.jsx (embedded multi-entity booth experience)
- ScanQR.jsx (camera + offline + DigitalBooth)
- OCRScanner.jsx (LLM pipeline)
- Onboarding.jsx (multi-step + OCR extract)
- IntegrationHub.jsx (when real OAuth added)
- LiveEventControlRoom.jsx / EventSupportCenter.jsx (aggregate queries)

---

## Recommended Migration Phases

### Phase 0 — Preparation (current)
- [x] Architecture documentation (this audit)
- [x] Tag `boothbridge-base44-final`
- [ ] Base44 data export procedure
- [ ] Supabase project + schema from JSONC entities

### Phase 1 — Foundation
- Extend `dbClient` to all 39 entities
- Implement Supabase client behind dbClient
- Migrate auth (AuthContext → Supabase Auth)
- Replace assetPipeline with Supabase Storage

### Phase 2 — Data Layer Sweep
- Replace all direct `base44.entities` with `db.*`
- Implement RLS policies from JSONC rules
- Data import with ID preservation

### Phase 3 — Platform Integrations
- Edge functions for InvokeLLM, ExtractDataFromUploadedFile
- Replace adminAuth function
- Implement real-time on Connection + Meeting

### Phase 4 — Admin & Security
- Unified admin RBAC (remove sessionStorage admin auth)
- MFA for admin roles
- Audit log retention

### Phase 5 — Cleanup
- Remove `@base44/sdk`, `@base44/vite-plugin`
- Delete orphan pages (Discover, EventsDirectory, LeadScoring)
- Remove unused dependencies (Stripe if not implementing payments)
- Consolidate duplicate entities in schema

### Phase 6 — Verification
- Offline sync end-to-end tests
- OCR / AI assistant regression
- NFC public profile flow
- QR scan → connection → notification chain
- Admin panel full regression

---

## Data Migration Checklist

| Entity group | Record volume risk | FK complexity |
|--------------|-------------------|---------------|
| User + profiles | High | Hub for all user_id FKs |
| Connection + RFI + Meeting | High | Connection is parent |
| Product + CatalogItem + Media | Medium | ExhibitorProfile links |
| NFC + ScannedContact | Medium | Optional lead/project links |
| Billing (3 models) | Low–Medium | User_id |
| Admin/ops entities | Low | Mostly standalone |
| Unused entities (Company, Booth, etc.) | Unknown | May be empty |

---

## Success Criteria

1. Zero runtime imports of `@base44/sdk` in production bundle
2. All 39 entities accessible via unified data layer with RLS enforced
3. User auth fully on new provider with OAuth parity (Google, LinkedIn)
4. File upload/download works for all catalog and image flows
5. OCR and AI assistant functional via replacement LLM API
6. Offline QR scan sync works against new backend
7. Admin panel uses unified auth with role-based access
8. No regression in buyer/exhibitor core flows (scan, connect, RFI, meeting)

---

## Related Documents

- [Architecture Audit](./architecture-audit.md)
- [Route Map](./route-map.md)
- [Entity Relationship Diagram](./entity-relationship-diagram.md)
- [Base44 Dependency Map](./base44-dependency-map.md)
