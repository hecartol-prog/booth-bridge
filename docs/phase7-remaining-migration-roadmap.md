# Phase 7 — Remaining Migration Roadmap

**Generated:** 2026-07-03  
**Completed through:** Phase 7.5A (platform audit)  
**Canonical Supabase project:** `jjqhmvfzqpohvukoxeoe`  
**Runtime (unchanged):** `VITE_DATA_BACKEND=base44`

This document covers **remaining phases only**. Phases 7.1–7.5A are complete or audited.

---

## Completed foundation (reference)

| Layer | Status |
|-------|--------|
| Schema (43 migrations) | ✅ Applied on `jjqhmvfzqpohvukoxeoe` |
| `dbClient` + `supabaseEntity` | ✅ Implemented (uncommitted) |
| `authClient` + `supabaseAuth` | ✅ Implemented (uncommitted) |
| `storageClient` + `assetPipeline` | ✅ Implemented (uncommitted) |
| `aiClient` + `supabaseAi` + prompts | ✅ Implemented (uncommitted) |
| Edge Function **source** | ✅ In repo (uncommitted) |
| Edge Function **deploy** (canonical) | ❌ Not on `jjqhmvfzqpohvukoxeoe` |
| Platform activation | ❌ Audited in 7.5A — gaps documented |

---

## Phase 7.5B — Security

**Objective:** Activate Supabase platform security without switching application runtime.

### Scope

- Create storage buckets (`boothbridge-media`, `boothbridge-assets`, `boothbridge-ocr`) — private
- Author storage RLS policies per path conventions in `storageBuckets.js`
- Enable RLS on all 39 `public` tables
- Add `092_rls_policies.sql` (or equivalent) translating Base44 RLS intent
- Deploy all 10 Edge Functions to **`jjqhmvfzqpohvukoxeoe`**
- Verify/set Edge Function secrets
- Configure Auth providers (Email SMTP, Google, LinkedIn OIDC) + redirect URLs
- Publish realtime tables (`meeting`, `connection`, others as needed)
- Create admin test user (`app_metadata.role = 'admin'`)
- Tighten CORS on Edge Functions (app origins)

### Dependencies

- Phase 7.5A audit complete ✅
- Dashboard access to `jjqhmvfzqpohvukoxeoe`
- Team vault for OAuth credentials and service role key

### Complexity

**High** — touches every security boundary (DB, Storage, Auth, Functions).

### Duration

**3–5 days** (one engineer, including policy design and smoke tests).

### Risk

| Risk | Level |
|------|-------|
| Over-restrictive RLS breaks pages | High |
| Under-restrictive RLS leaves data exposed | High |
| OAuth misconfiguration blocks login | Medium |
| Wrong project ref for deploy | Medium (enforce canonical target `jjqhmvfzqpohvukoxeoe`) |

---

## Phase 7.5C — Seed

**Objective:** Populate clean demo data on Supabase for integration testing.

### Scope

- Seed script(s) for `auth.users` + `public.user` row sync
- Demo events, exhibitors, buyers, booths, products, connections
- Admin user(s) with correct `app_metadata`
- Optional sample media/catalog objects in storage buckets
- No Base44 data import (schema-only strategy)

### Dependencies

- Phase 7.5B (RLS + buckets + auth providers)
- `SUPABASE_SERVICE_ROLE_KEY` in local/CI vault

### Complexity

**Medium** — data modeling + FK integrity across 39 tables.

### Duration

**2–3 days**

### Risk

| Risk | Level |
|------|-------|
| `auth.users.id` ≠ `public.user.id` mismatch | Medium |
| Seed data violates RLS during script | Medium |
| Incomplete seed blocks E2E paths | Low |

---

## Phase 7.6 — Integration testing

**Objective:** End-to-end verification with `VITE_DATA_BACKEND=supabase` on preview only.

### Scope

- Preview env: `VITE_DATA_BACKEND=supabase` + Supabase URL/anon key
- Auth flows: register, OTP, login, OAuth, password reset, admin
- CRUD on all major entities via `dbClient`
- Upload/download via `storageClient` / `assetPipeline`
- AI flows via Edge Functions (OCR, chat, document, match, recommend)
- Realtime: meetings, connections
- Regression: Base44 path still works on production default
- Performance spot-checks on APAC region latency

### Dependencies

- 7.5B + 7.5C complete
- Vercel preview environment variables

### Complexity

**Medium–High** — broad surface area, many user journeys.

### Duration

**3–5 days**

### Risk

| Risk | Level |
|------|-------|
| Hidden Base44 assumptions in pages | Medium |
| Signed URL display gaps for private storage | Medium |
| AI cost/latency in preview | Low |

---

## Phase 7.7 — Production cutover

**Objective:** Switch production runtime to Supabase.

### Scope

- Production readiness review (security advisors, load, backups)
- Vercel production env: `VITE_DATA_BACKEND=supabase`
- DNS / domain OAuth redirect finalization
- Monitoring and alerting (Auth, DB, Functions, Storage)
- Rollback plan documented and tested
- Base44 decommission plan (read-only period)

### Dependencies

- 7.6 sign-off on preview/staging
- Stakeholder approval for cutover window

### Complexity

**High** — operational, not just code.

### Duration

**2–3 days** (cutover window + soak)

### Risk

| Risk | Level |
|------|-------|
| Production outage during switch | High |
| OAuth redirect mismatch on prod domain | High |
| No rollback if Base44 disabled too early | High |

---

## Phase 8 — Post-cutover cleanup

**Objective:** Remove Base44 dependency and technical debt.

### Scope

- Remove or gate `base44Client.js` and Base44 branches in abstraction clients
- Remove `media.base44.com` static logo URLs → public assets or Supabase CDN
- Delete archived Base44 Edge Function paths if unused
- Remove `VITE_DATA_BACKEND=base44` code paths (or keep feature flag for emergency rollback window)
- Update documentation and onboarding for Supabase-only ops
- Optional: delete/orphan any non-canonical Supabase project after confirming all operators use `jjqhmvfzqpohvukoxeoe`
- Optional: delete abandoned refs from phase reports

### Dependencies

- 7.7 stable in production (recommended 2+ weeks soak)

### Complexity

**Medium** — mostly deletion and simplification.

### Duration

**3–5 days**

### Risk

| Risk | Level |
|------|-------|
| Premature Base44 removal before soak complete | Medium |
| Missed Base44 import in obscure page | Low |

---

## Timeline summary

| Phase | Est. duration | Cumulative |
|-------|---------------|------------|
| 7.5B Security | 3–5 days | Week 1 |
| 7.5C Seed | 2–3 days | Week 1–2 |
| 7.6 Integration testing | 3–5 days | Week 2–3 |
| 7.7 Production cutover | 2–3 days | Week 3 |
| 8 Post-cutover cleanup | 3–5 days | Week 4 |

**Total remaining:** ~3–4 weeks with one senior engineer.

---

## Critical path

```
7.5B (RLS + buckets + functions on canonical ref)
  → 7.5C (seed)
    → 7.6 (E2E on preview)
      → 7.7 (prod cutover)
        → 8 (cleanup)
```

**Current blocker:** 7.5B cannot start meaningfully until uncommitted 7.4 work is committed and Edge Functions are deployed to `jjqhmvfzqpohvukoxeoe`.
