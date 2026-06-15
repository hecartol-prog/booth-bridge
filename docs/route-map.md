# BoothBridge Route Map

**Generated:** 2026-06-13  
**Router:** React Router v6 (`BrowserRouter` in `App.jsx`)

---

## Route Summary

| Category | Count |
|----------|-------|
| Public (no user auth) | 6 |
| Auth-only (login/register) | 4 |
| Protected (user auth + layout) | 38 |
| Protected onboarding | 1 |
| Admin (separate session) | 22 |
| Redirects | 3 |
| Catch-all | 1 |

---

## Route Tree

```
/
├── PUBLIC — no ProtectedRoute
│   ├── /login                    Login.jsx
│   ├── /register                 Register.jsx
│   ├── /forgot-password          ForgotPassword.jsx
│   ├── /reset-password           ResetPassword.jsx
│   ├── /nfc/:userId              NFCProfileView.jsx
│   └── /admin-login              AdminLogin.jsx
│
├── PROTECTED — ProtectedRoute (requires Base44 auth)
│   ├── /onboarding               Onboarding.jsx          [no AppLayout]
│   │
│   └── AppLayout + OnboardedGuard
│       ├── /                     Home.jsx → ExhibitorDashboard | BuyerDashboard
│       ├── /qr                   QRCode.jsx
│       ├── /scan                 ScanQR.jsx (+ embedded DigitalBooth)
│       ├── /connections          Connections.jsx
│       ├── /rfi-inbox            RFIInbox.jsx
│       ├── /my-rfis              MyRFIs.jsx
│       ├── /meetings             Meetings.jsx
│       ├── /products             Products.jsx
│       ├── /business-card        BusinessCard.jsx
│       ├── /BusinessCard         → redirect /business-card
│       ├── /businesscard         → redirect /business-card
│       ├── /notifications        Notifications.jsx
│       ├── /catalogue            Catalogue.jsx
│       ├── /saved-booths         SavedBooths.jsx
│       ├── /my-library           MyLibrary.jsx
│       ├── /catalog-library      CatalogLibrary.jsx
│       ├── /profile              Profile.jsx
│       ├── /events               EventDirectory.jsx
│       ├── /discover             ExhibitorDiscover.jsx
│       ├── /organizer-analytics  OrganizerAnalytics.jsx
│       ├── /integrations         IntegrationHub.jsx
│       ├── /workspace/compare    SupplierCompare.jsx
│       ├── /lead-intelligence    LeadIntelligence.jsx
│       ├── /analytics            ExhibitorAnalytics.jsx
│       ├── /premium-booth        PremiumBooth.jsx
│       ├── /organizer-command    OrganizerCommandCenter.jsx
│       ├── /nfc                  NFCExchange.jsx
│       ├── /nfc-admin            NFCOrganizerPanel.jsx
│       ├── /ocr-scanner          OCRScanner.jsx
│       ├── /contacts             ScannedContacts.jsx
│       ├── /billing              BillingCenter.jsx
│       └── /setup-wizard         ExhibitorSetupWizard.jsx
│
├── ADMIN — AdminLayout (sessionStorage bb_admin_authed)
│   ├── /admin                    AdminDashboard.jsx
│   ├── /admin/users              AdminUsers.jsx
│   ├── /admin/exhibitors         AdminExhibitors.jsx
│   ├── /admin/products           AdminProducts.jsx
│   ├── /admin/catalogues         AdminCatalogues.jsx
│   ├── /admin/events             AdminEvents.jsx
│   ├── /admin/connections        AdminConnections.jsx
│   ├── /admin/revenue            AdminRevenue.jsx
│   ├── /admin/leads              AdminLeads.jsx
│   ├── /admin/media              AdminMedia.jsx
│   ├── /admin/settings           AdminSettings.jsx
│   ├── /admin/data-quality       AdminDataQuality.jsx
│   ├── /admin/audit              AdminAuditLog.jsx
│   ├── /admin/event-readiness    EventReadinessCenter.jsx
│   ├── /admin/control-room       LiveEventControlRoom.jsx
│   ├── /admin/support-center     EventSupportCenter.jsx
│   ├── /admin/tickets            AdminSupportTickets.jsx
│   ├── /admin/nfc-validation     AdminNFCValidation.jsx
│   ├── /admin/search             AdminGlobalSearch.jsx
│   ├── /admin/stress-test        AdminStressTest.jsx
│   ├── /admin/monitoring         AdminMonitoring.jsx
│   └── /admin/ocr-review         AdminOCRReview.jsx
│
└── *                             PageNotFound.jsx
```

---

## Authentication & Guards

| Guard | Location | Behavior |
|-------|----------|----------|
| `AuthProvider` | `App.jsx` wrapper | Loads public settings, checks token, sets `authError` types |
| `ProtectedRoute` | Wraps onboarding + main app | Redirects unauthenticated users to `/login` |
| `OnboardedGuard` | Inside protected `AppLayout` routes | Redirects to `/onboarding` if `!onboarded` or missing `user_role` |
| Admin session check | `AdminLayout` | `sessionStorage.bb_admin_authed` → else `/admin-login` |
| Auth error fallback | `AuthenticatedApp` | `user_not_registered` → `UserNotRegisteredError`; other errors → login routes only |

**Onboarding bypass:** Users with `role === admin` or `bb_impersonate_as_user === true` skip onboarding.

**Unauthenticated app state:** When `auth_required`, only login/register/forgot/reset routes render; all other paths redirect to `/login`.

---

## Layouts

| Layout | Used by | Features |
|--------|---------|----------|
| `AuthLayout` | Login, Register, ForgotPassword, ResetPassword | Branded auth shell, optional admin link easter egg |
| `AppLayout` | All main app routes under `OnboardedGuard` | Role-based sidebar (`exhibitorNav` / `buyerNav`), notifications badge, language switcher, admin role switcher |
| `AdminLayout` | All `/admin/*` routes | Grouped sidebar nav, mobile drawer, separate dark theme |
| None | Onboarding, NFCProfileView, AdminLogin, PageNotFound | Full-page standalone |

---

## Navigation vs Routes

### Buyer nav (`AppLayout` — `buyerNav`)

| Nav path | Route exists |
|----------|--------------|
| `/` | Yes |
| `/scan` | Yes |
| `/saved-booths` | Yes |
| `/my-library` | Yes |
| `/my-rfis` | Yes |
| `/meetings` | Yes |
| `/qr` | Yes |
| `/events` | Yes |
| `/workspace/compare` | Yes |
| `/discover` | Yes |
| `/nfc` | Yes |
| `/ocr-scanner` | Yes |
| `/contacts` | Yes |
| `/billing` | Yes |

### Exhibitor nav (`AppLayout` — `exhibitorNav`)

| Nav path | Route exists |
|----------|--------------|
| `/` | Yes |
| `/qr` | Yes |
| `/connections` | Yes |
| `/rfi-inbox` | Yes |
| `/catalog-library` | Yes |
| `/products` | Yes |
| `/meetings` | Yes |
| `/business-card` | Yes |
| `/events` | Yes |
| `/lead-intelligence` | Yes |
| `/analytics` | Yes |
| `/premium-booth` | Yes |
| `/nfc` | Yes |
| `/organizer-analytics` | Yes |
| `/organizer-command` | Yes |
| `/integrations` | Yes |
| `/billing` | Yes |

**Note:** Exhibitor nav has duplicate label "Leads" for `/connections` and `/lead-intelligence` (different `labelKey` values in code).

### Admin nav (`AdminLayout` — `navGroups`)

All 22 admin routes listed in route tree are linked from sidebar groups: Overview, Users & Accounts, Content, Intelligence, Finance, Event Operations, Production, System.

### Organizer command center cross-links

`OrganizerCommandCenter.jsx` links to admin routes:
- `/admin/event-readiness`
- `/admin/control-room`
- `/admin/support-center`

These require **admin session** — organizer users without admin login will be redirected to `/admin-login`.

---

## Embedded / Non-Route Pages

| Page file | How accessed |
|-----------|--------------|
| `DigitalBooth.jsx` | Embedded in `ScanQR.jsx` when booth scanned |
| `ExhibitorDashboard.jsx` | Rendered by `Home.jsx` for exhibitors |
| `BuyerDashboard.jsx` | Rendered by `Home.jsx` for buyers |

---

## Orphan Pages (No Route Registered)

These page components exist under `src/pages/` but are **not** registered in `App.jsx`:

| File | Likely intent | Status |
|------|---------------|--------|
| `Discover.jsx` | Exhibitor discovery | Superseded by `ExhibitorDiscover.jsx` at `/discover` |
| `EventsDirectory.jsx` | Event listing | Superseded by `EventDirectory.jsx` at `/events` |
| `LeadScoring.jsx` | Lead scoring UI | Logic lives in `leadScoring.js` + `LeadIntelligence.jsx` |

---

## Route → Primary Entities

| Route | Primary entities accessed |
|-------|---------------------------|
| `/` | Connection, RFI, Meeting, SavedBooth, SavedProduct, BuyerProfile, ExhibitorProfile, LeadInteraction, CatalogItem, SourcingProject |
| `/scan` | Connection, ExhibitorProfile, Notification, SavedBooth, SavedProduct, CatalogItem, RFI, Product, CatalogItem |
| `/qr` | None (displays user id in QR) |
| `/connections` | Connection, RFI, Media, Meeting, Notification |
| `/rfi-inbox` | RFI, Notification |
| `/my-rfis` | RFI, Connection, Notification |
| `/meetings` | Meeting, Connection, ExhibitorProfile, Event |
| `/products` | Product |
| `/business-card` | ExhibitorProfile, BuyerProfile |
| `/notifications` | Notification |
| `/catalogue` | CatalogItem |
| `/saved-booths` | SavedBooth |
| `/my-library` | SavedProduct |
| `/catalog-library` | CatalogItem |
| `/profile` | User profile via auth + role profiles |
| `/events` | Event, ExhibitorProfile |
| `/discover` | ExhibitorProfile, Product |
| `/organizer-analytics` | ExhibitorProfile, Connection, Meeting, RFI, CatalogItem, Event |
| `/integrations` | IntegrationConnection, IntegrationSyncLog, Activity |
| `/workspace/compare` | SourcingProject, ProjectSupplierMapping, ExhibitorProfile |
| `/lead-intelligence` | Connection, LeadInteraction, RFI, Meeting |
| `/analytics` | Connection, RFI, Meeting, LeadInteraction, ExhibitorProfile |
| `/premium-booth` | ExhibitorProfile, PremiumBoothSubscription, Connection, RFI, Meeting, CatalogItem |
| `/organizer-command` | Event, ExhibitorProfile, Connection, SavedBooth, SponsoredListing, etc. |
| `/nfc` | NFCProfile, NFCInteraction |
| `/nfc-admin` | NFCProfile, NFCProductTag, NFCInteraction |
| `/nfc/:userId` | NFCProfile, NFCInteraction, Connection |
| `/ocr-scanner` | ScannedContact |
| `/contacts` | ScannedContact |
| `/billing` | BillingSubscription, BillingTransaction |
| `/setup-wizard` | ExhibitorProfile, Product, CatalogItem |
| `/onboarding` | ExhibitorProfile, BuyerProfile, User (auth.updateMe) |
| `/admin/*` | Most entities (dashboard aggregates many) |

---

## Query Parameter / URL Token Flow

| Parameter | Handler | Purpose |
|-----------|---------|---------|
| `app_id` | `app-params.js` | Base44 app identification |
| `access_token` | `app-params.js` | OAuth callback token (removed from URL after read) |
| `functions_version` | `app-params.js` | Function deployment version |
| `app_base_url` | `app-params.js` | SDK base URL |
| `clear_access_token=true` | `app-params.js` | Clears stored tokens |

---

## Related Documents

- [Architecture Audit](./architecture-audit.md)
- [Entity Relationship Diagram](./entity-relationship-diagram.md)
