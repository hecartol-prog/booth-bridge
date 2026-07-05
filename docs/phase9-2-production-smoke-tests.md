# Phase 9.2 — Production Smoke Tests

**Generated:** 2026-07-05  
**Harness:** `scripts/phase7-6-e2e-validation.mjs`  
**Target URL:** `https://boothbridge.app`  
**Evidence tiers:** LIVE (executed), STATIC (code/RLS), BLOCKED (cannot run), MANUAL (browser required)

---

## Executive Summary

Automated API-level smoke was **live-validated in Phase 7.6** on the canonical Supabase project. **Full browser validation on the production URL was not executed this session** because `boothbridge.app` did not respond and client credentials were not available in the validation shell. This report provides the **production smoke matrix**, evidence mapping, and a manual sign-off checklist for operators to execute immediately after Phase 9.1 P0 deployment.

### Classification: **GO WITH WARNINGS**

Core backend workflows are validated at the API layer. Production browser pass is **required** before pilot day — treat unchecked MANUAL items as launch blockers for the corresponding feature.

---

## Pre-Conditions

Before running smoke tests:

- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set on deployed host
- [ ] Frontend deployed and reachable at production or preview URL
- [ ] Supabase Auth redirect URLs include deployment origin
- [ ] SMTP configured (for register, OTP, password reset browser tests)
- [ ] (If AI in scope) `OPENROUTER_API_KEY` set; `ai-health` ping returns `ok`

---

## Smoke Test Matrix

### Visitor / Public

| Scenario | Method | Status | Evidence | Notes |
|----------|--------|--------|----------|-------|
| Public NFC profile `/nfc/:userId` | MANUAL | ⬜ Pending | Route exists (`App.jsx`) | No auth required |
| Event directory browse | MANUAL | ⬜ Pending | `/events` route | Requires auth for full app — visitor may need register |
| Digital booth view (buyer) | STATIC + 7.6 | ✅ API | `DigitalBooth.jsx`, product read RLS | Browser: signed URLs, media render |
| Offline banner / cache | STATIC | ✅ Code | `OfflineBanner`, `visitorCache.js` | Test airplane mode on booth page |
| Offline save booth / RFI queue | STATIC | ✅ Code | `visitorInteractionQueue.js` | Sync on reconnect via `useOfflineSync` |

### Authentication

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Login (email/password) | LIVE 7.6 | ✅ PASS | Phase 7.6 harness |
| Register | LIVE 7.6 | ⚠️ WARN | Rate-limited in 7.6 |
| OTP verify (signup + email) | LIVE 7.6 | ✅ PASS | Phase 7.6 |
| Password reset | LIVE 7.6 | ✅ PASS | Recovery link + re-login |
| Logout | LIVE 7.6 | ✅ PASS | Phase 7.6 |
| Session refresh | LIVE 7.6 | ✅ PASS | Token rotation |
| Google OAuth | MANUAL | ⬜ Pending | URL generated in 7.6; callback not browser-tested |
| LinkedIn OAuth | MANUAL | ⬜ Pending | Same |
| Production login page load | MANUAL | ⬜ Pending | Host unreachable this session |

### Company & Exhibitor

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Onboarding flow | MANUAL | ⬜ Pending | `/onboarding`, `OnboardedGuard` |
| Company profile | LIVE 7.6 | ✅ PASS | Company CRUD |
| Create booth | LIVE 7.6 | ✅ PASS | Booth insert |
| Exhibitor setup wizard | MANUAL | ⬜ Pending | `/setup-wizard` |
| Premium booth page | STATIC | ✅ Code | `/premium-booth` |

### Products & Catalogues

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Create product | LIVE 7.6 | ✅ PASS | Product CRUD |
| Upload catalogue (assets bucket) | LIVE 7.6 | ✅ PASS | Storage upload |
| View catalogue (signed URL) | LIVE 7.6 + 7.7A | ✅ PASS | Entity signed URL resolution |
| Catalogue library | MANUAL | ⬜ Pending | `/catalog-library` |

### Media

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Upload logo/product image | LIVE 7.6 | ✅ PASS | `boothbridge-media` |
| Render signed URL in UI | STATIC + 7.7A | ✅ PASS | `supabaseEntity.js` field list |
| Delete (owner) | LIVE 7.6 | ✅ PASS | Owner policies |
| Delete (non-owner blocked) | LIVE 7.6 | ✅ PASS | Cross-user blocked |

### Business Card OCR

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| OCR scan upload | MANUAL | ⬜ Pending | `/ocr-scanner` |
| AI business card extraction | BLOCKED | ❌ | AI credentials invalid (7.6) |
| Scanned contacts list | MANUAL | ⬜ Pending | `/contacts` |

### AI Assistant

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Booth AI chat | BLOCKED | ❌ | `ai-chat` → `AI_AUTHENTICATION` |
| AI document summary | BLOCKED | ❌ | `ai-document` |
| AI health probe | LIVE 7.6 | ⚠️ Degraded | 401 on provider |
| Disable AI client-side | STATIC | ✅ | `VITE_AI_ENABLED=false` |

### Meeting & Connections

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Meeting request | LIVE 7.6 | ✅ PASS | `meeting_request` insert |
| Meeting CRUD | LIVE 7.6 | ✅ PASS | Meeting entity |
| Connection create | LIVE 7.6 | ✅ PASS | Connection insert |
| QR scan → connection | MANUAL | ⬜ Pending | `/scan`, offline queue |
| Connections list | MANUAL | ⬜ Pending | `/connections` |

### Realtime

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Connection INSERT event | LIVE 7.6 | ✅ PASS | Sub-second latency |
| Connection UPDATE event | LIVE 7.6 | ✅ PASS | Both participants |
| Meeting UPDATE event | LIVE 7.6 | ✅ PASS | Both participants |
| Browser WebSocket on prod | MANUAL | ⬜ Pending | Requires deployed app |

### Notifications

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Self-notification | LIVE 7.6 | ✅ PASS | Recipient = sender |
| Cross-user notification | LIVE 7.6 | ❌ FAIL | Abstraction vs RLS |
| Notifications page | MANUAL | ⬜ Pending | `/notifications` |

### Storage (browser)

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| File picker upload | MANUAL | ⬜ Pending | Products, Onboarding |
| Image preview after upload | MANUAL | ⬜ Pending | Signed URL in DOM |
| Catalog PDF download | MANUAL | ⬜ Pending | Buyer booth view |

### Admin

| Scenario | Method | Status | Evidence |
|----------|--------|--------|----------|
| Admin login | LIVE 7.6 | ✅ PASS | `app_metadata.role = admin` |
| Admin exhibitor list | STATIC | ✅ | Admin RLS policies |
| Admin media view | STATIC | ✅ | `storage_admin_select` |
| Admin OCR review | MANUAL | ⬜ Pending | `/admin/ocr-review` |
| Live event control room | MANUAL | ⬜ Pending | `/admin/control-room` |

---

## Build Smoke (this session)

| Build | Command | Result |
|-------|---------|--------|
| Supabase default | `npm run build` | ✅ Exit 0 |
| Base44 rollback | `$env:VITE_DATA_BACKEND="base44"; npm run build` | ✅ Exit 0 |

---

## Automated Re-Run

```powershell
$env:SUPABASE_URL="https://jjqhmvfzqpohvukoxeoe.supabase.co"
$env:SUPABASE_ANON_KEY="<anon>"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role>"
node scripts/phase7-6-e2e-validation.mjs
```

Run after AI secrets fixed and before pilot sign-off.

---

## Manual Browser Checklist (sign-off)

Copy to operator runbook; mark each on production URL:

```
[ ] App loads — no "Missing VITE_SUPABASE_URL" error
[ ] Register new buyer account (email received)
[ ] Login exhibitor → setup wizard → create booth
[ ] Upload product image — renders in UI
[ ] Upload catalogue PDF — buyer can open signed URL
[ ] Buyer: discover exhibitor → save booth → request meeting
[ ] Both users see meeting update without refresh (realtime)
[ ] QR scan at booth (or manual connection)
[ ] OCR scan (if AI enabled)
[ ] AI booth assistant responds (if AI enabled)
[ ] Admin login → exhibitor list → view media
[ ] Password reset email → set new password → login
[ ] Google OAuth round-trip (if enabled)
[ ] Offline: save booth → reconnect → sync completes
```

---

## Defects Carried Forward

| ID | Severity | Description | Pilot impact |
|----|----------|-------------|--------------|
| D-1 | High | AI credentials missing/invalid | Disable AI or fix secrets |
| D-2 | Medium | Cross-user notification create | Manual workaround; fix post-pilot |
| D-3 | Medium | Register rate limit | Tune Auth limits before event |
| D-4 | Medium | Production host not live | **Deploy before pilot** |

---

## Review

Phase 9.2 documents the complete smoke surface area. API-level confidence is **high** from Phase 7.6; **browser and production-host validation remain open** and must be completed by operators after deployment.

---

## Prompt for Next Phase

**Phase 9.3 — Performance Audit**

After preview/production deploy, measure first load, navigation, Edge latency, storage upload time, realtime delay, AI response time, and bundle composition. Establish baseline metrics for exhibition-day monitoring.

---

## Commands Before Phase 9.3

```powershell
# Deploy and open production/preview URL in browser
npm run build
npm run preview   # local baseline only

# Optional: Lighthouse on production URL
npx lighthouse https://boothbridge.app --output=json --output-path=./docs/lighthouse-prod.json

# Edge latency probe (authenticated)
# POST https://jjqhmvfzqpohvukoxeoe.functions.supabase.co/ai-health
# Body: { "ping": true } with user JWT
```

---

## Classification

| Category | Status |
|----------|--------|
| API / harness smoke (7.6) | ✅ GO |
| Browser production smoke | ⚠️ PENDING |
| AI-dependent flows | ❌ BLOCKED without secrets |
| **Overall Phase 9.2** | **GO WITH WARNINGS** |
