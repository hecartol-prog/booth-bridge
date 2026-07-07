# RC5-7 — Realtime Production Validation

**Generated:** 2026-07-06  
**Canonical project:** `jjqhmvfzqpohvukoxeoe`  
**WebSocket endpoint:** `wss://jjqhmvfzqpohvukoxeoe.supabase.co/realtime/v1`

---

## Executive Summary

| Area | RC5 status |
|------|------------|
| Publication config (repo + migrations) | **PASS** |
| Meetings channel | **NOT VERIFIED** live |
| Connections channel | **NOT VERIFIED** live |
| Notifications (DB realtime) | **N/A** — not in publication (app uses polling/insert) |
| Subscribe / reconnect | **NOT VERIFIED** |
| Channel cleanup | **NOT VERIFIED** |
| Duplicate listeners | **NOT VERIFIED** |

---

## Schema Configuration (applied)

From `supabase/migrations/095_realtime.sql`:

| Table | Publication |
|-------|-------------|
| `public.connection` | `supabase_realtime` |
| `public.meeting` | `supabase_realtime` |

Migration list confirms `095` applied on remote (`supabase migration list --linked`).

---

## Application Integration (code review)

| Feature | Client location | Channel |
|---------|-----------------|---------|
| Connections | Pages using `db.connection` + subscriptions | `connection` table changes |
| Meetings | `Meetings.jsx` / related hooks | `meeting` table changes |
| Notifications | `notification` entity | **Not** in realtime publication — fetch on load / after actions |

Realtime client: `@supabase/supabase-js` via `getSupabaseClient()` — requires `VITE_SUPABASE_*` on deployed host.

---

## Live RC5 Tests

| Test | Result |
|------|--------|
| WebSocket handshake | **NOT EXECUTED** |
| INSERT on `meeting` → subscriber receives event | **NOT EXECUTED** |
| UPDATE on `connection` → both parties see change | **NOT EXECUTED** |
| Reconnect after network drop | **NOT EXECUTED** |
| `removeChannel` on unmount | **NOT EXECUTED** |

**Why:** No production frontend deployed; no authenticated browser session in RC5 validator environment.

---

## Phase 7.8F Historical Results (reference)

From `docs/phase7-8f-realtime-validation.md`:

| Test | Result |
|------|--------|
| Publication tables present | **PASS** |
| Live update propagation (CLI/harness) | **PASS** |
| Cross-user meeting visibility | **PASS** (RLS-scoped) |

**Stale until re-run on production URL.**

---

## Notifications Clarification

User smoke checklist includes "Notification" step. Implementation path:

1. Row inserted in `notification` table (known cross-user RLS quirk documented in Phase 7.6)
2. UI refresh — may **not** use Realtime push unless separately subscribed

Realtime RC5 scope: **`connection` and `meeting` only** per migration.

---

## Production Prerequisites

1. `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on Vercel
2. WSS not blocked by venue/event Wi‑Fi (pilot risk)
3. Users authenticated (Realtime respects RLS)

---

## How to Verify (Operator Checklist)

### Two-browser test

1. Deploy app to production/preview
2. **Browser A (Exhibitor):** open `/meetings`
3. **Browser B (Buyer):** request meeting with Exhibitor A
4. **Browser A:** confirm meeting appears **without full page reload** (< 3s)
5. **Browser A:** accept/decline → **Browser B** sees status update
6. DevTools → Network → WS → confirm `wss://jjqhmvfzqpohvukoxeoe.supabase.co/realtime/v1`
7. Navigate away from `/meetings` → confirm channel unsubscribed (no duplicate events on return)

### Connections

1. Open `/connections` on both sides
2. Create connection request → recipient sees update in realtime

---

## Verdict

**NOT VERIFIED live in RC5.**

Migration-applied configuration: **PASS**. Operational realtime behavior requires **post-deploy two-user browser test**.
