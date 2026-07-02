# Phase 6 — Dry Run Report

> **⛔ ARCHIVED — Data Migration Waiver (2026-07-01)**  
> Export pipeline not executed. Preserved for historical reference.  
> Active roadmap: [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)

> **SNAPSHOT (6C.2 heuristics):** Estimates below are derived from `scripts/phase6/dry-run-estimate.mjs` — not measured production counts.

**Status:** Pre-execution estimate (no API calls, no production row counts).  
**Generated:** Phase 6C.2 tooling batch; synchronized 2026-07-01 (6C.3A.0).

---

## Estimates

Values computed from heuristics in `dry-run-estimate.mjs` (`ROW_COUNT_ESTIMATE`, `ROW_SIZE_ESTIMATE`, `PAGE_SIZE=5000`, `PHASE6_REQUEST_DELAY_MS=200`):

| Metric | Value |
|--------|-------|
| Total entities | **39** |
| Estimated total rows | **~39,720** (heuristic; dominant tables: Activity, Notification, Connection) |
| Estimated export size | **~31.6 MB** uncompressed JSON |
| Estimated API pages (export only) | **~42** (@ 5,000 rows/page across all entities) |
| Estimated export duration | **~0.5 min** (export pages only; excludes UUID verification API volume) |

Re-run for console breakdown:

```bash
npm run phase6:dry-run
```

**Note:** Gate 2 UUID verification (6C.3B) performs a full row-count scan per entity plus per-index random fetches — significantly more API calls than export-only estimates above.

---

## API & rate limits

| Limit | Source | Mitigation |
|-------|--------|------------|
| 5,000 rows per `list()` call | Base44 SDK docs | Automatic pagination in `lib/paginated-export.mjs` |
| Function invoke throughput | Platform (undocumented) | `PHASE6_REQUEST_DELAY_MS` throttle (default 200ms) |
| HTTP 429 | Possible under burst | Increase delay to 500–1000ms if observed |
| Service role scope | Backend functions only | `phase6Export` Deno function |

---

## Execution sequence (gates)

| Gate | Sub-phase | Action |
|------|-----------|--------|
| — | — | `npm run phase6:dry-run` (this report) |
| 1 | 6C.3A | Deploy `phase6Export` + set `PHASE6_EXPORT_SECRET`; `npm run phase6:verify-infra` |
| 2 | 6C.3B | `npm run phase6:verify-uuid` — stratified sample, **console only** |
| — | — | **Approval** — review UUID console output |
| 3 | 6C.4 | `npm run phase6:export` |
| 4 | 6C.5 | Validate `exports/phase6/manifest.json` row counts |
| 5 | 6D | Import planning (not implemented) |

---

## Risks before export

- Production data contains PII — `exports/phase6/` must stay out of git (`.gitignore` enforced)
- UUID format unproven until Gate 2 runs against production
- `User` export **requires** service role (admin login alone is insufficient)
- Large JSON fields (`digital_card`, `raw_results`) may inflate file size beyond estimates
