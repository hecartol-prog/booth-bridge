# Phase 9.6 — Commercial Readiness

**Generated:** 2026-07-05  
**Scope:** Pricing, subscriptions, free/premium tiers, event workflow, visitor/exhibitor journeys, activation, onboarding  
**Architecture changes:** None (assessment only)

---

## Executive Summary

BoothBridge has **rich commercial UI and database schema** for billing (`billing_subscription`, `premium_booth_subscription`, `billing_transaction`, `sponsored_listing`) but **no live payment integration**. Stripe and PayPal buttons in `BillingCenter.jsx` are presentational only. The **free tier operates by default** via company `subscription_plan = free` and absent premium subscription records. Core exhibition workflows (discovery, connections, meetings) do not require payment for pilot.

### Classification: **NOT READY** (for revenue launch)

**READY** for a **free pilot** validating product-market fit. **NOT READY** to accept paid subscriptions until Stripe (or equivalent) checkout is implemented and tested.

---

## 1. Pricing

### Displayed plans (`src/pages/BillingCenter.jsx`)

| Plan ID | Name | Price | Interval | Target |
|---------|------|-------|----------|--------|
| `premium_booth` | Premium Booth | $49 | month | Exhibitors |
| `featured_supplier` | Featured Supplier | $99 | month | Exhibitors |
| `organizer` | Organizer Pro | $299 | month | Event organizers |

### Premium booth page (`PremiumBooth.jsx`)

Uses separate `PremiumBoothSubscription` entity with `plan_type`: `standard` | `premium` and status `trial` | `active` | etc.

### Database schema

| Table | Purpose |
|-------|---------|
| `billing_subscription` | User-level plans (Stripe/PayPal provider fields) |
| `premium_booth_subscription` | Exhibitor premium status |
| `billing_transaction` | Charge/refund history |
| `sponsored_listing` | Promoted placement |
| `company.subscription_plan` | `free` \| `professional` \| `enterprise` |

**Gap:** UI prices are hardcoded in React — not fetched from a pricing API or Stripe Products.

---

## 2. Subscription Integration

| Component | Status |
|-----------|--------|
| `@stripe/react-stripe-js` in dependencies | ✅ Installed |
| `@stripe/stripe-js` in dependencies | ✅ Installed |
| `VITE_STRIPE_*` env vars | ❌ Not found |
| Checkout session / PaymentIntent code | ❌ Not found |
| Stripe webhook Edge Function | ❌ Not found |
| PayPal integration | ❌ UI button only |
| Admin revenue page | ✅ `/admin/revenue` (display) |

### BillingCenter payment buttons

```jsx
<Button disabled={isActive}>Pay with Stripe</Button>
<Button variant="outline" disabled={isActive}>Pay with PayPal</Button>
```

No `onClick` handler, no Stripe Elements mount — **non-functional**.

---

## 3. Free Plan

| Mechanism | Implementation |
|-----------|----------------|
| Default company plan | `subscription_plan` default `free` (`012_company.sql`) |
| Premium gating | `PremiumBooth.jsx` checks `PremiumBoothSubscription.status === 'active'` |
| Feature limits (50 products, etc.) | Described in plan marketing copy — **not enforced in code review** |
| Trial status | `billing_subscription.status` default `trial` |

**Pilot implication:** All exhibitors operate on **free/trial tier** unless admin manually sets subscription records.

---

## 4. Premium Features

| Feature (marketing) | Gated by subscription? | Evidence |
|--------------------|--------------------------|----------|
| Featured search placement | ⚠️ Partial | `sponsored_listing` entity exists |
| Lead Intelligence | UI route exists | `/lead-intelligence` — verify role/plan gate |
| Unlimited products | Not verified | Product CRUD may be ungated |
| Catalog uploads | ✅ Available on free tier | Live 7.6 |
| Organizer command center | Role-based likely | `/organizer-command` |
| Premium booth branding | `PremiumBooth` page | Subscription check for `isPremium` |

**Recommendation:** Manual admin can grant premium by inserting `premium_booth_subscription` row for pilot exhibitors — no payment required.

---

## 5. Event Workflow

| Step | Actor | Route / feature | Payment required? |
|------|-------|-----------------|-------------------|
| Create event | Admin/Organizer | `/admin/events`, `/events` | No |
| Assign exhibitors | Admin | Admin exhibitors | No |
| Exhibitor setup | Exhibitor | `/setup-wizard`, `/onboarding` | No |
| Event directory | Buyer | `/events` | No |
| Live monitoring | Organizer | `/admin/control-room` | No |
| Event readiness | Admin | `/admin/event-readiness` | No |
| NFC badges | Organizer | `/nfc-admin` | No |

**Assessment:** Event workflow is **functionally complete for pilot** without billing.

---

## 6. Visitor Journey

| Stage | Flow | Commercial touchpoint |
|-------|------|----------------------|
| Arrive | QR / link → register or login | Free |
| Discover | `/events`, `/discover` | Free |
| View booth | `DigitalBooth` component | Free |
| Save booth | Save dialog + optional offline queue | Free |
| Request meeting | Meeting request dialog | Free |
| Download catalog | Signed URL | Free |
| RFI submit | RFI dialog | Free |
| AI assistant | `AiBoothAssistant` | Would consume AI credits — blocked |

**Assessment:** Visitor journey is **commercially open** (no paywall) — appropriate for exhibition lead-gen pilot.

---

## 7. Exhibitor Journey

| Stage | Flow | Commercial touchpoint |
|-------|------|----------------------|
| Register | `/register` → `/onboarding` | Free |
| Company setup | Onboarding wizard | Free |
| Booth creation | Setup wizard, products | Free |
| Media/catalog upload | Products, Catalogue pages | Free |
| Premium upsell | `/premium-booth`, `/billing` | **UI only — no charge** |
| Lead analytics | `/analytics`, `/lead-intelligence` | May imply premium |
| Billing | `/billing` | Non-functional payments |

**Activation friction:** Email verification + onboarding required (`OnboardedGuard`). SMTP must work for self-serve activation.

---

## 8. Activation Flow

```
Register → Email OTP (if enabled) → Login
  → Onboarding (role + company) → user.onboarded = true
  → App routes unlocked → Setup wizard (exhibitor)
  → Booth live in event directory
```

| Step | Blocker risk |
|------|--------------|
| Email delivery | SMTP not configured |
| Rate limits | Auth email_sent = 2/hr local config — tune in Dashboard |
| OAuth shortcut | Google/LinkedIn — callback untested on prod |
| Admin pre-provision | Bypass register — create users via Dashboard |

**Pilot recommendation:** Pre-provision exhibitor accounts to avoid signup friction on event day.

---

## 9. Onboarding

| Component | Path | Status |
|-----------|------|--------|
| Role selection | `/onboarding` | ✅ Implemented |
| Exhibitor setup wizard | `/setup-wizard` | ✅ Implemented |
| Onboarded guard | `OnboardedGuard` in `App.jsx` | ✅ Enforced |
| Admin skip onboarding | Admin role bypass | ✅ |

---

## 10. Commercial Readiness Matrix

| Capability | Pilot (free) | Revenue launch |
|------------|--------------|----------------|
| Exhibitor CRM workflows | ✅ Ready | ✅ |
| Buyer lead capture | ✅ Ready | ✅ |
| Premium feature gating | ⚠️ Manual admin | Needs enforcement rules |
| Stripe checkout | ❌ | Required |
| Invoicing / receipts | Schema only | Required |
| Refunds | Schema only | Required |
| Tax / compliance | Not addressed | Future |
| Pricing page accuracy | Static UI | Sync with Stripe Products |

---

## 11. Recommendations

### For pilot (now)

1. Run **free pilot** — no payment collection
2. Manually grant premium rows for 1–2 showcase exhibitors if needed
3. Hide or disable "Pay with Stripe" buttons to avoid confusion (optional UX — not required for docs phase)
4. Pre-create accounts to skip registration friction

### Before revenue launch (post-pilot)

5. Implement Stripe Checkout Sessions or Payment Links
6. Add webhook Edge Function for `checkout.session.completed`
7. Sync `billing_subscription` + `billing_transaction` from webhooks
8. Enforce product limits by plan in RLS or application layer
9. Add `VITE_STRIPE_PUBLISHABLE_KEY` + server webhook secret
10. Legal: terms of service, refund policy

---

## Review

Commercial **product surface** exists; **payment rail** does not. This is acceptable for an exhibition pilot focused on lead capture and workflow validation, not monetization.

---

## Prompt for Next Phase

**Phase 9.7 — Deployment Manual**

Produce operator guides: production deploy, rollback, recovery, secrets, environment, developer onboarding.

---

## Commands Before Phase 9.7

None required.

---

## Classification

| Dimension | Status |
|-----------|--------|
| Free pilot commercial | ✅ READY |
| Paid subscription launch | ❌ NOT READY |
| Event workflow | ✅ READY |
| Visitor/exhibitor journeys | ✅ READY (with Auth SMTP caveat) |
| **Overall Phase 9.6** | **NOT READY** for revenue; **READY** for free pilot |
