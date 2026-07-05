# Phase 7.8H — Performance Validation

**Generated:** 2026-07-05  
**Build tool:** Vite 6.1.0  
**Measurement session:** Local production build (`npm run build`)

## Executive Summary

The production bundle is **~1.65 MB total** with a **~1.6 MB main JS chunk** — acceptable for an MVP but dominated by a single `index-*.js` asset. No live edge or database latency benchmarks were run this session (credentials unavailable). Phase 7.6 and gateway code provide design bounds for AI latency.

## Build Size

| Asset | Size |
|-------|------|
| `dist/assets/index-*.js` | **1601.6 KB** (~1.56 MB) |
| `dist/assets/index-*.css` | 88 KB |
| `dist/index.html` | 1.8 KB |
| `dist/sw.js` | 1.4 KB |
| **Total `dist/`** | **1.65 MB** |

### Observations

- Single large JS bundle — typical for Vite SPA without route-based code splitting
- `@base44/sdk` + `@base44/vite-plugin` still in dependency graph (rollback path) — contributes to bundle size post-RC3
- No `manualChunks` configured in `vite.config.js`

## Cold Start

| Component | Measurement | Notes |
|-----------|-------------|-------|
| Vite production build | ~48–64 s (this session) | Dev machine; not CI |
| Edge Function cold start | Not measured | Deno isolate on Supabase — typically 100–500 ms |
| Supabase client init | Not measured | `getSupabaseClient()` singleton |

## Latency (design bounds / prior evidence)

| Path | Bound / observation | Source |
|------|---------------------|--------|
| AI per-provider timeout | 1000–5000 ms (clamped) | `aiGateway.ts` |
| AI worst-case failover | Up to ~40 s (8 × 5 s timeout) | Theoretical max |
| Realtime event delivery | Sub-second | Phase 7.6 live |
| Database (PostgREST) | Not profiled | Recommend Dashboard query stats post-launch |
| Edge Function (non-AI) | Not profiled | `admin-auth` lightweight |

## Network Requests (architectural)

| Pattern | Risk | Notes |
|---------|------|-------|
| Entity list + detail | Possible duplicate fetches | React Query used in many pages — cache helps |
| Signed URL resolution | N+1 potential | `supabaseEntity.js` resolves per row — monitor on large lists |
| AI calls | Single Edge invoke per action | Client builds prompt once |

## Identified Issues

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| 1.6 MB main bundle | Medium | Post-launch: route-based `React.lazy()` for admin/heavy pages |
| Base44 SDK in bundle | Low | Remove after rollback window (Phase 7.7 inventory) |
| No production RUM | Medium | Add Vercel Analytics or Datadog RUM post-deploy |
| AI cascade latency | Medium | Ensure OpenRouter key healthy to avoid full chain |
| N+1 signed URLs | Low | Batch signed URL API if lists grow |

## Duplicate Calls

Static review — no automated duplicate-call trace run. Pages using `@tanstack/react-query` benefit from query deduplication. Manual profiling recommended on:

- `EventDirectory` exhibitor counts
- Admin data grids
- Buyer dashboard meeting/connection lists

## Classification

**Performance: PASS with recommendations** — build succeeds at reasonable size; live latency profiling deferred to post-deploy monitoring.
