# Phase 7.8F — Realtime Validation

**Generated:** 2026-07-05  
**Client:** `src/utils/supabaseEntity.js` (`subscribe()` multiplexing)  
**Publication:** `supabase/migrations/095_realtime.sql`

## Executive Summary

Realtime is configured for the two tables the application actually subscribes to: `connection` and `meeting`. Phase 7.6 live tests confirmed INSERT and UPDATE propagation to both participants. Notifications and presence are **not** implemented via Supabase Realtime in the current codebase.

## Published Tables (live)

| Table | In `supabase_realtime` publication | App `db.*.subscribe()` |
|-------|-----------------------------------|------------------------|
| `connection` | ✅ | ✅ |
| `meeting` | ✅ | ✅ |
| `notification` | ❌ | Not subscribed (fetch/poll) |

Verified via live SQL: `pg_publication_tables` for `pubname = 'supabase_realtime'`.

## Validation Results (Phase 7.6 live)

| Scenario | Connection | Meeting |
|----------|------------|---------|
| INSERT propagation to participants | ✅ PASS | ✅ PASS |
| UPDATE propagation to participants | ✅ PASS | ✅ PASS |
| Latency | Sub-second (observed) | Sub-second (observed) |

Both owner and participant clients received `postgres_changes` events.

## Client Behavior

- Channels multiplexed per table in `supabaseEntity.js` to avoid duplicate subscriptions
- Reconnect: Supabase JS client handles WebSocket reconnect; app does not custom-implement backoff
- Offline recovery: not explicitly coded — relies on client library + React Query refetch on focus

## Not Validated (out of scope / not implemented)

| Feature | Status |
|---------|--------|
| Notification realtime push | Not published — use DB insert + in-app fetch |
| Presence | Not implemented |
| Subscription reconnect stress test | Not run this phase |
| Offline queue sync | Separate offline scan queue (`offlineScanQueue.js`) — not realtime |

## Production Recommendations

1. Monitor Realtime connection count in Supabase Dashboard after launch.
2. If notification push is required later, add `notification` to publication + subscribe in UI (schema change + feature — post-launch).
3. Ensure production uses `wss://` endpoint via `VITE_SUPABASE_URL` (automatic with hosted project).

## Classification

**Realtime: PASS** for implemented scope (`connection`, `meeting`). No blocking gaps for current product features.
