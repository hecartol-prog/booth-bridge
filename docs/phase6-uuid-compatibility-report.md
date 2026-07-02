# Phase 6 — UUID Compatibility Report

> **⛔ ARCHIVED — Data Migration Waiver (2026-07-01)**  
> Gate 2 UUID verification not required. Preserved for historical reference.

> **TEMPLATE / NOT EXECUTED**

**Status:** ARCHIVED — UUID verification not executed (data migration waived).

---

## How verification works (matches implementation)

`verify-uuid-sample.mjs` performs a **stratified sample per entity** (max **20** rows after dedupe by `id`):

| Slice | Count | Sort |
|-------|-------|------|
| Earliest | 5 | `+created_date` |
| Latest | 5 | `-created_date` |
| Random | 10 | Uniform index into ASC-ordered population |

**Output: console only** — the script does **not** write:

- `exports/phase6/samples/*.json`
- `exports/phase6/uuid-sample-analysis.json`
- This report file

Record results manually below after running Gate 2, or paste console summary into a new dated section.

---

## Summary recommendation

**Not yet determined.** IDs must be proven from live samples — do not assume UUIDs.

After running verification, expect one of:

- **Preserve IDs directly** — all entities with data are 100% RFC 4122 UUID compatible (`ids_are_uuid`), or
- **Generate remapping tables** — one or more entities have mixed/non-UUID IDs (`ids_are_mixed` / `ids_require_remapping`)

Schema supports remapping via `legacy_base44_id` on all Supabase entity tables (6C.1).

---

## Per-entity analysis (placeholder)

| Entity | Sampled | UUID | Non-UUID | Missing ID | UUID % | Classification | Confidence |
|--------|---------|------|----------|------------|--------|----------------|------------|
| *All 39 entities* | — | — | — | — | — | Pending | — |

---

## Regex used

- **Primary:** `UUID_RFC4122_RE` → `^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case-insensitive)
- **Source:** `scripts/phase6/lib/uuid-analysis.mjs`

---

## Instructions

```bash
# 1. Gate 1 must PASS first (see phase6-infrastructure-verification-report.md)
# 2. Configure env (see scripts/phase6/README.md)
# 3. Run verification (console output only)
npm run phase6:verify-uuid
# 4. Record recommendation and per-entity table in this file manually
```
