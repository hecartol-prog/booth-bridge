# Phase 7.8G — End-to-End Smoke Test

**Generated:** 2026-07-05  
**Harness:** `scripts/phase7-6-e2e-validation.mjs`  
**Last live run:** Phase 7.6 (2026-07-04)  
**This session:** Builds verified; live harness **not re-run** (missing `SUPABASE_*` in shell)

## Executive Summary

End-to-end workflows were validated live in Phase 7.6 and structurally re-verified in Phase 7.7 RC3. RC3 changed the default backend to Supabase without altering business logic. This report maps required smoke scenarios to evidence tiers: **LIVE**, **STATIC**, **BLOCKED**.

## Exhibitor Workflow

| Step | Status | Evidence |
|------|--------|----------|
| Login | ✅ LIVE | Phase 7.6 |
| Create booth | ✅ LIVE | `booth` CRUD PASS |
| Upload catalog | ✅ LIVE | `boothbridge-assets` upload PASS |
| Upload media | ✅ LIVE | `boothbridge-media` upload PASS |
| AI summary | ❌ BLOCKED | Invalid AI credentials (7.6) |
| Publish | ✅ STATIC | Booth/product update via `dbClient` — no separate publish gate found |
| Logout | ✅ LIVE | Phase 7.6 |

## Buyer Workflow

| Step | Status | Evidence |
|------|--------|----------|
| Login | ✅ LIVE | Phase 7.6 |
| Search exhibitors | ✅ STATIC | `exhibitor_profile` authenticated read policy |
| View booth | ✅ LIVE | RC2 buyer dashboard fix + product read |
| Save booth | ✅ STATIC | `saved_booth` entity + RLS buyer policies |
| Request meeting | ✅ LIVE | `meeting_request` insert PASS |
| Create connection | ✅ LIVE | `connection` CRUD PASS |
| Receive notification | ⚠️ PARTIAL | Self-recipient PASS; cross-user create fails on abstraction (7.6 defect) |
| Logout | ✅ LIVE | Phase 7.6 |

## Admin Workflow

| Step | Status | Evidence |
|------|--------|----------|
| Login | ✅ LIVE | Admin JWT + `app_metadata.role` |
| Manage exhibitors | ✅ STATIC | Admin RLS `*_admin_all` policies |
| Manage catalogs | ✅ STATIC | Admin storage + catalog_item policies |
| View media | ✅ STATIC | `storage_admin_select` |
| Logout | ✅ LIVE | Phase 7.6 |

## Build Smoke (this session)

| Build | Command | Result |
|-------|---------|--------|
| Supabase default | `npm run build` | ✅ Exit 0 |
| Base44 rollback | `$env:VITE_DATA_BACKEND="base44"; npm run build` | ✅ Exit 0 |

## Discovered Defects (carried forward)

### 1. Cross-user notification creation

- **Type:** Code defect (abstraction vs RLS)
- **Impact:** Buyer may not receive notification when sender uses `sendNotification()` cross-user
- **Location:** `supabaseEntity.js` `.insert().select().single()` vs recipient-only SELECT policy
- **Severity:** Medium — not a deployment blocker for core exhibitor/buyer flows

### 2. AI features blocked

- **Type:** Configuration
- **Impact:** OCR, chat assistant, summaries fail
- **Severity:** High for AI-dependent UX; core CRUD unaffected

### 3. Register rate limit

- **Type:** Infrastructure / Auth config
- **Impact:** New user signup during heavy testing
- **Severity:** Medium

## Re-run Instructions

```bash
export SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co
export SUPABASE_ANON_KEY=<anon>
export SUPABASE_SERVICE_ROLE_KEY=<service role>
node scripts/phase7-6-e2e-validation.mjs
```

Run after: (1) AI secrets fixed, (2) production `VITE_*` set on preview, (3) SMTP configured.

## Classification

**Smoke: PASS with warnings** — core business paths validated live; AI and cross-user notifications remain open items.
