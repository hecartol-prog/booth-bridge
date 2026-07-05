# Phase 9.3 — Performance Audit

**Generated:** 2026-07-05  
**Build tool:** Vite 6.1.0  
**Measurement session:** Local production build + Phase 7.6/7.8 prior evidence  
**Production RUM:** Not configured

---

## Executive Summary

The production bundle is **~1.73 MB uncompressed** in `dist/`, dominated by a **1.56 MB main JavaScript chunk**. Build succeeds reliably (~42–64 s locally). Live production latency was **not measured** this session (no deployed URL, no credentials for Edge profiling). Design bounds and Phase 7.6 realtime observations indicate **acceptable MVP performance** for a pilot, with clear post-launch optimization targets.

### Classification: **GO WITH WARNINGS**

Performance is adequate for pilot if CDN/host caching is enabled. Add RUM and Edge monitoring before scaling to multi-hall exhibition traffic.

---

## 1. First Load

| Metric | Measurement | Target (MVP) | Status |
|--------|-------------|--------------|--------|
| `index.html` | 1.8 KB | < 5 KB | ✅ |
| Main JS (`index-oJhibAm2.js`) | **1,640,052 bytes (1.56 MB)** | < 2 MB | ⚠️ Acceptable |
| Main CSS (`index-B3J9BANq.css`) | 90,138 bytes (88 KB) | < 150 KB | ✅ |
| Service worker (`sw.js`) | 1.4 KB | — | ✅ |
| **Total `dist/`** | **~1.73 MB** | < 2.5 MB | ⚠️ |
| Gzip/Brotli (host-dependent) | Not measured | ~400–500 KB typical | ⬜ Deploy-time |

### First-load observations

- Single-bundle SPA — entire app loads on first navigation
- `@base44/sdk` still in dependency graph (rollback path) — contributes unused weight post-RC3
- No route-based code splitting (`React.lazy`) configured
- No `manualChunks` in `vite.config.js`

### Recommendations

| Priority | Action | Impact |
|----------|--------|--------|
| P2 | `React.lazy()` for admin routes (~15 pages) | −200–400 KB initial JS |
| P3 | Remove `@base44/sdk` after rollback window | −50–100 KB estimated |
| P1 | Enable Brotli on CDN (Vercel default) | 60–70% transfer reduction |
| P1 | Add Vercel Analytics or Datadog RUM | Baseline TTFB, LCP, FID |

---

## 2. Page Navigation

| Aspect | Finding |
|--------|---------|
| Routing | React Router 6 — client-side, no full reload |
| Data fetching | TanStack Query — cache deduplication on repeated queries |
| Auth gate | `AuthProvider` blocks render until session resolved |
| Onboarding redirect | `OnboardedGuard` — extra navigation hop for new users |

### Potential duplicate fetches (static review)

| Page / pattern | Risk | Mitigation |
|----------------|------|------------|
| Event directory exhibitor counts | Medium | React Query cache |
| Admin data grids | Medium | Pagination not universal |
| Signed URL per row | Medium–High | N+1 on large lists |
| Buyer dashboard meetings + connections | Low | Separate query keys |

**Recommendation:** Profile with React DevTools + Network tab on `EventDirectory`, `AdminExhibitors`, and buyer `Meetings` during Phase 9.2 browser pass.

---

## 3. Edge Function Latency

| Function class | Expected cold start | Per-request bound | Measured |
|----------------|--------------------|--------------------|----------|
| `admin-auth` | 100–500 ms | < 200 ms warm | ⬜ |
| AI functions | 100–500 ms cold | 1–5 s per provider attempt | ⬜ |
| Non-AI Edge | Minimal | < 500 ms | ⬜ |

### AI gateway bounds (`aiGateway.ts`)

| Parameter | Value |
|-----------|-------|
| Per-provider timeout | 1,000–5,000 ms (clamped) |
| Provider chain length | Up to 8 routes |
| Theoretical worst case | ~40 s (all timeouts) |
| Typical (healthy OpenRouter) | 1–3 s |

**Critical:** Missing `OPENROUTER_API_KEY` forces fallback chain → **higher latency and failure rate**. Fix secrets before measuring AI SLA.

---

## 4. Storage Upload

| Bucket | Max size (repo) | Client path | Expected upload (4G) |
|--------|-----------------|-------------|----------------------|
| `boothbridge-media` | 50 MB | Direct SDK upload | 2–15 s for 5 MB image |
| `boothbridge-assets` | 100 MB | Catalog PDFs | 5–30 s for 10 MB |
| `boothbridge-ocr` | 15 MB | Camera capture | 1–5 s for 1 MB |

Phase 7.6 live tests: uploads succeed at API level. Browser upload UX depends on exhibitor device and hall Wi‑Fi — **test on venue network before pilot**.

---

## 5. Realtime Latency

| Event | Phase 7.6 observation | Target |
|-------|----------------------|--------|
| `connection` INSERT | Sub-second | < 2 s |
| `connection` UPDATE | Sub-second | < 2 s |
| `meeting` UPDATE | Sub-second | < 2 s |

WebSocket endpoint: `wss://jjqhmvfzqpohvukoxeoe.supabase.co/realtime/v1` (via Supabase JS client).

**Exhibition risk:** Hall Wi‑Fi may cause WebSocket disconnects. Supabase JS reconnects automatically; app relies on React Query refetch on focus — **not custom backoff**.

---

## 6. AI Latency

| Route | Status | Expected (healthy) |
|-------|--------|-------------------|
| `ai-chat` | Blocked (credentials) | 2–5 s |
| `ai-business-card` | Blocked | 3–8 s (vision) |
| `ai-document` | Blocked | 5–15 s (large doc) |
| `ai-summary` | Blocked | 3–10 s |

Client timeout: inherits Edge gateway; UI should show loading states (`Loader2` components present on AI pages).

---

## 7. Bundle Size Breakdown

| Asset | Size | % of JS |
|-------|------|---------|
| `index-*.js` | 1.64 MB | 100% (single chunk) |
| `index-*.css` | 88 KB | — |
| `sw.js` | 1.4 KB | — |

### Largest dependencies (from `package.json`)

| Package | Category | Split candidate |
|---------|----------|-----------------|
| `recharts` | Admin analytics | Lazy-load admin |
| `react-quill` | Rich text | Lazy-load editor pages |
| `three` | 3D (if used) | Lazy-load |
| `leaflet` / `react-leaflet` | Maps | Lazy-load event pages |
| `@base44/sdk` | Rollback only | Remove post-cutover |
| `framer-motion` | Animations | Global — moderate |

---

## 8. Production Optimization Recommendations

### Before pilot (P0–P1)

1. Enable CDN compression (Brotli) on host
2. Set cache headers for static assets (Vite hashed filenames — long cache safe)
3. Fix OpenRouter key to avoid AI failover latency cascade
4. Test upload/download on venue Wi‑Fi sample

### First week post-pilot (P2)

5. Route-based code splitting for `/admin/**`
6. Batch signed URL resolution for list views
7. Supabase Dashboard: monitor slow queries, Realtime connections, Edge errors
8. Add frontend RUM (LCP, INP, CLS)

### Post-rollback window (P3)

9. Remove Base44 SDK from bundle
10. Consider connection pooling (Supabase Pro) if concurrent users > 100

---

## 9. Benchmark Commands

```powershell
# Local build timing + sizes
Measure-Command { npm run build }
Get-ChildItem -Recurse dist | Select-Object Name, Length

# Lighthouse (after deploy)
npx lighthouse https://boothbridge.app --only-categories=performance

# Supabase Dashboard (operator)
# Reports → Database query performance
# Reports → Edge Function invocations + duration
# Reports → Realtime connections
```

---

## Review

MVP bundle size and architecture are **pilot-viable**. Live latency baselines must be captured post-deploy. Exhibition-specific risk is **network quality**, mitigated partially by offline queues (`offlineScanQueue.js`, `visitorInteractionQueue.js`).

---

## Prompt for Next Phase

**Phase 9.4 — Security Audit**

Consolidate Phase 7.8I findings with production deployment context. Confirm no regression in JWT handling, RLS, storage, admin paths, Edge secrets, or environment exposure.

---

## Commands Before Phase 9.4

No blocking commands. Optional:

```powershell
# Supabase security advisors (requires MCP auth or Dashboard)
# Dashboard → Database → Advisors → Security
```

---

## Classification

| Area | Status |
|------|--------|
| Build / bundle | ⚠️ GO WITH WARNINGS |
| Live latency | ⬜ Not measured |
| Realtime (prior live) | ✅ GO |
| AI latency | ❌ Blocked (credentials) |
| **Overall Phase 9.3** | **GO WITH WARNINGS** |
