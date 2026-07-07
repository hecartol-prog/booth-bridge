# RC5-10 — Performance Production Validation

**Generated:** 2026-07-06  
**Scope:** Live probes where possible + local build metrics. Production app routes **not measurable** (not deployed).

---

## Executive Summary

| Metric | RC5 result | Notes |
|--------|------------|-------|
| Home load (`boothbridge.app`) | **N/A** — wrong content | Hostinger placeholder ~3.57s TTFB |
| Dashboard load | **NOT MEASURED** | App not deployed |
| Digital Booth | **NOT MEASURED** | |
| Storage upload | **NOT MEASURED** | |
| OCR | **NOT MEASURED** | |
| AI completion | **NOT MEASURED** | |
| Realtime latency | **NOT MEASURED** | |
| Edge Function cold start | **PARTIAL** — `ai-health` 429–668ms (auth reject) |
| Bundle size (JS) | **1,640,646 bytes** | Local `npm run build` |
| Bundle size (CSS) | **90,138 bytes** | Local build |
| Largest request | **NOT MEASURED** on prod | |
| Largest response | **NOT MEASURED** on prod | |

---

## Local Build — Bundle Size

**Command:** `npm run build` (2026-07-06, default `VITE_DATA_BACKEND=supabase`)

| Asset | Bytes | MiB |
|-------|-------|-----|
| `dist/assets/index-z0V-zYqZ.js` | 1,640,646 | ~1.56 |
| `dist/assets/index-B3J9BANq.css` | 90,138 | ~0.09 |
| `dist/index.html` | 1,834 | |
| `dist/sw.js` | 1,404 | |
| **Total `dist/`** | ~1.73 MB | (approx., excl. gzip) |

### Assessment

| Threshold | Status |
|-----------|--------|
| JS < 2 MB uncompressed | **PASS** |
| Code-splitting | **NOT IMPLEMENTED** — single main chunk |
| Gzip/Brotli on Vercel | **NOT VERIFIED** until deployed |

Prior Phase 9.3 recommendation: consider lazy routes for admin/analytics — **not in RC5 scope**.

---

## Live Network Timings

### Production domain (placeholder)

```text
https://boothbridge.app
Total time: ~3569 ms (PowerShell Measure-Command, 2026-07-06)
Content: Hostinger default HTML (~4.5 KB error pages for 404 routes)
```

**Not representative** of BoothBridge app performance.

### Supabase Auth health

```text
https://jjqhmvfzqpohvukoxeoe.supabase.co/auth/v1/health
Total time: ~1190 ms
```

### Edge Function (`ai-health` — rejected auth)

```text
POST .../functions/v1/ai-health
time_total: ~1.56s
HTTP: 401
response size: 201 bytes
```

Includes cold-start possibility on first invocation; auth failed before provider probe.

---

## Production Route Timings (target — NOT MEASURED)

| Route | Target | RC5 |
|-------|--------|-----|
| `/` (Home) | < 3s LCP | ⏭ |
| `/` (Dashboard after login) | < 4s | ⏭ |
| `/booth/:id` (Digital Booth) | < 4s | ⏭ |
| Storage upload (1 MB logo) | < 5s | ⏭ |
| OCR pipeline end-to-end | < 15s | ⏭ |
| AI summary | < 8s (5s gateway timeout) | ⏭ |
| Realtime event delivery | < 2s | ⏭ |

---

## Edge Function Cold Start

| Function | RC5 sample | Notes |
|----------|------------|-------|
| `ai-health` | ~429–1556 ms to 401 response | Auth failure; not full probe path |
| Other AI functions | **NOT MEASURED** | |
| `admin-auth` | **NOT MEASURED** | |

Supabase Edge v2 — expect 200–800ms warm, 1–3s cold under load.

---

## Largest Request / Response

**NOT MEASURED** on production traffic.

**Expected largest client requests:**

- OCR image upload (multi-MB JPEG/PNG) to Storage
- AI document extraction (base64 / file URL in JSON)

**How to measure post-deploy:** Chrome DevTools → Network → sort by Size; run OCR + catalog upload flows.

---

## How to Verify (Operator Checklist)

1. Deploy to Vercel (Production)
2. Lighthouse on `https://boothbridge.app` (mobile + desktop)
3. Record: FCP, LCP, TTI, total bundle transferred (gzip)
4. Login → Dashboard — note `DOMContentLoaded` and API waterfall
5. Upload 500 KB logo — time to signed URL render
6. OCR scan — time to structured result
7. AI summary — time to first token/result (watch 5s timeout)
8. Two-browser meeting update — WS message latency
9. Repeat `ai-health` ping 5× — note cold vs warm latency

---

## Verdict

**INCOMPLETE** — local bundle metrics **PASS** size budget; **no production application performance data**.

Re-run this report after Vercel deploy with Lighthouse + Network captures.
