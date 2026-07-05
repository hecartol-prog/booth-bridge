# Phase 9.5 — Pilot Readiness

**Generated:** 2026-07-05  
**Pilot context:** First real exhibition deployment  
**Platform:** BoothBridge on Supabase (`jjqhmvfzqpohvukoxeoe`)  
**Target domain:** `https://boothbridge.app`

---

## Executive Summary

BoothBridge is **technically capable of supporting a controlled exhibition pilot** for core exhibitor–buyer workflows (booth setup, discovery, connections, meetings, media, offline scan queue). **Operational readiness gaps** remain: production frontend not confirmed live, AI features blocked without provider secrets, commercial payments not wired, and monitoring/incident runbooks not yet executed on production traffic.

### Classification: **READY WITH WARNINGS**

Proceed with a **limited pilot** (single event, known exhibitor cohort, AI optional/disabled) after completing the P0 checklist below. Do not run a marketing-heavy public launch until browser smoke and SMTP/OAuth are verified.

---

## 1. Operational Readiness

| Area | Status | Notes |
|------|--------|-------|
| Supabase backend | ✅ Ready | 47 migrations, RLS, storage, realtime, 10 Edge Functions |
| Frontend deployment | ❌ Not confirmed | `boothbridge.app` unreachable this session |
| Client env configuration | ⚠️ Pending | `VITE_SUPABASE_*` on host |
| Auth email delivery | ⚠️ Pending | Production SMTP not configured |
| AI features | ❌ Blocked | OpenRouter missing; OpenAI invalid |
| Base44 rollback | ✅ Available | 48h window; env switch < 5 min |
| Database backups | ⚠️ Unverified | Confirm Supabase plan PITR |
| Admin users provisioned | ⚠️ Verify | `app_metadata.role = admin` |
| Event data seeded | ⬜ Operator | Events, booths via admin or exhibitor onboarding |
| README / ops docs | ⚠️ Stale | Still Base44-only — Phase 9.7 addresses |

---

## 2. Support Requirements

### Pilot-day staffing

| Role | Minimum | Responsibilities |
|------|---------|------------------|
| Engineering on-call | 1 | Edge errors, deploy rollback, Supabase Dashboard |
| Product / event ops | 1 | Exhibitor onboarding, buyer FAQ |
| Supabase operator | 0.5 | Auth SMTP, rate limits, backup confirm |

### Support channels (existing in app)

| Feature | Location | Pilot use |
|---------|----------|-----------|
| Support tickets | Admin `/admin/tickets` | Escalate exhibitor issues |
| Event support center | `/admin/support-center` | Event-day triage |
| Live control room | `/admin/control-room` | Monitor event activity |

### Known user-facing limitations to communicate

1. AI OCR/assistant unavailable until provider keys set (or disable in UI)
2. Cross-user notifications may not appear for some connection events
3. Stripe/PayPal buttons are display-only — no live billing
4. Register may hit email rate limits under bulk signup — pre-create accounts if needed

---

## 3. Offline Behavior

| Capability | Implementation | Pilot-ready? |
|------------|----------------|--------------|
| QR scan queue | `offlineScanQueue.js` (IndexedDB + localStorage fallback) | ✅ Yes |
| Visitor action queue | `visitorInteractionQueue.js` (save booth, RFI, catalog) | ✅ Yes |
| Background sync | `useOfflineSync` hook on `online` event | ✅ Yes |
| Booth content cache | `visitorCache.js` | ✅ Yes |
| Offline banner UX | `OfflineBanner` component | ✅ Yes |
| Realtime while offline | WebSocket drops — sync on reconnect | ⚠️ Acceptable |
| Full offline app | Not supported — requires network for auth + initial load | Expected |

### Exhibition hall scenario

```
Visitor scans QR offline
  → enqueueScan() local
  → OfflineBanner shown
  → On reconnect: useOfflineSync creates Connection + Notification
```

**Pilot recommendation:** Brief exhibitors to encourage buyers to reconnect to Wi‑Fi/4G after scanning. Test sync on venue network during setup day.

---

## 4. Recovery

| Scenario | Procedure | RTO |
|----------|-----------|-----|
| Bad frontend deploy | Vercel instant rollback to previous deployment | < 5 min |
| Supabase backend issue | Base44 rollback: `VITE_DATA_BACKEND=base44` + redeploy | < 5 min |
| AI provider outage | Set `VITE_AI_ENABLED=false`; core app continues | < 10 min |
| Auth SMTP failure | Magic link/OTP fail — use password login; fix SMTP | Hours |
| Database corruption | Supabase PITR restore (operator) | Plan-dependent |
| Edge Function error spike | Dashboard logs → redeploy function version | 15–30 min |

Rollback detail: `docs/phase7-8j-rollback.md`

---

## 5. Monitoring

| Layer | Tool | Status | Action |
|-------|------|--------|--------|
| Frontend errors | None configured | ❌ | Add Sentry or Vercel Analytics |
| Edge Functions | Supabase Dashboard logs | ✅ Available | Watch `ai_gateway` errors |
| Database | Supabase Reports | ✅ Available | Slow queries, connections |
| Realtime | Supabase Realtime metrics | ✅ Available | Connection count |
| Auth | Supabase Auth logs | ✅ Available | Failed login spike |
| Uptime | None | ❌ | Add UptimeRobot on `/` and Supabase health |
| AI health | `POST ai-health` `{ping:true}` | ⚠️ | Run after secrets set |

### Pilot-day thresholds (suggested)

| Metric | Warning | Critical |
|--------|---------|----------|
| Edge 5xx rate | > 5% over 5 min | > 15% |
| Auth failure rate | > 20% over 10 min | SMTP down |
| Realtime disconnects | Subjective | Mass user reports |
| Page load errors | Any `getSupabaseClient` throw | Immediate rollback |

---

## 6. Logging

| Source | Content | Access |
|--------|---------|--------|
| Edge Functions | Structured AI gateway logs (`logStructured`) | Supabase Dashboard → Edge Functions → Logs |
| Browser console | Client errors | Support staff reproduce |
| Postgres | Audit via `admin_access_log` table | Admin audit page |
| No centralized log aggregation | — | Accept for MVP; add Datadog later |

---

## 7. Incident Response

### Severity levels

| Level | Example | Response |
|-------|---------|----------|
| S1 | App down, data breach suspected | Rollback immediately; notify stakeholders |
| S2 | AI down, notifications broken | Disable feature flag; communicate workaround |
| S3 | Single exhibitor upload fail | Support ticket; manual assist |
| S4 | Cosmetic UI | Fix post-event |

### Incident playbook (pilot)

1. **Detect** — user report or monitoring alert
2. **Triage** — Engineering checks Vercel status + Supabase Dashboard
3. **Mitigate** — rollback deploy or disable AI (`VITE_AI_ENABLED=false`)
4. **Communicate** — event ops broadcasts to exhibitor WhatsApp/group
5. **Resolve** — fix forward or schedule post-pilot
6. **Post-mortem** — document within 48h

### Contacts (fill before pilot)

| Role | Name | Contact |
|------|------|---------|
| Engineering lead | _____________ | _____________ |
| Supabase org owner | _____________ | _____________ |
| Vercel/host admin | _____________ | _____________ |

---

## 8. Pilot Checklist

### T-7 days

- [ ] Complete Phase 9.1 P0 deployment
- [ ] Run Phase 9.2 browser smoke on production URL
- [ ] Confirm SMTP + test password reset email
- [ ] Pre-create admin + test exhibitor + test buyer accounts
- [ ] Seed event record and booth assignments
- [ ] Decide AI scope (enable secrets OR `VITE_AI_ENABLED=false`)
- [ ] Confirm backup/PITR on Supabase plan
- [ ] Assign on-call roster

### T-1 day

- [ ] Venue Wi‑Fi test: login, upload, QR scan, offline sync
- [ ] Print QR codes linking to app/booth URLs
- [ ] Exhibitor 30-min onboarding session (booth, products, catalogue)
- [ ] Verify realtime meeting update with two devices
- [ ] Rollback drill: confirm previous Vercel deployment ID

### Event day (T-0)

- [ ] Engineering online 30 min before doors
- [ ] Monitor Supabase Edge + Auth dashboards
- [ ] Support channel active (WhatsApp/Telegram)
- [ ] Hourly check: error logs, signup rate
- [ ] Offline sync spot-check at least once

### T+1 day

- [ ] Export connection/meeting metrics from admin
- [ ] Collect exhibitor feedback
- [ ] Post-mortem for any S1/S2 incidents
- [ ] Plan notification fix + AI enablement if deferred

---

## 9. Pilot Scope Recommendation

### Include in pilot (GO)

- Exhibitor onboarding + booth + products + catalogues
- Buyer discovery + save booth + meeting request
- QR scan + connections (online + offline sync)
- Admin exhibitor/media management
- Realtime meeting updates

### Exclude or disable (WARN)

- AI OCR / booth assistant (until secrets fixed)
- Live Stripe/PayPal checkout
- Bulk public self-registration (pre-create if rate limits tight)
- NFC advanced flows (unless separately tested)

---

## Review

Pilot is **viable as a controlled technical validation** at a single exhibition. Success depends on **deploying the frontend**, **configuring Auth email**, and **setting realistic feature scope** (core CRM flows yes; AI/billing deferred).

---

## Prompt for Next Phase

**Phase 9.6 — Commercial Readiness**

Review pricing UI, subscription entities, payment integration status, and exhibitor/buyer activation flows for revenue readiness.

---

## Commands Before Phase 9.6

No technical commands required. Optional business review of `BillingCenter.jsx` plan definitions vs go-to-market pricing.

---

## Classification

| Dimension | Status |
|-----------|--------|
| Core platform pilot | ✅ READY WITH WARNINGS |
| AI-enabled pilot | ❌ NOT READY |
| Paid subscription pilot | ❌ NOT READY |
| **Overall Phase 9.5** | **READY WITH WARNINGS** |
