# BoothBridge Project State — July 2026

> **Current canonical references:**  
> - Phase 6 closure: [`phase6-master-execution-plan.md`](./phase6-master-execution-plan.md)  
> - Phase 7 roadmap: [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)  
> - Base44 audit: [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md)

**Handoff document for Base44 → Supabase migration**  
**Date:** Updated 2026-07-01 (Phase 6 closed; Phase 7 active)  
**Repository:** `booth-bridge`  
**Audience:** Engineers continuing migration work

---

## 1. Current Branch Status

| Item | State |
|------|--------|
| **Active branch** | `migration/base44-independence` (checked out) |
| **Base branch** | `main` (synced with `origin/main`) |
| **Remote** | `origin/migration/base44-independence` exists |
| **Latest commit** | `c91a472` — *Phase 1 foundation layer completed* |
| **Working tree** | Supabase migrations + Phase 6 export tooling (archived) + Phase 7 docs |
| **Runtime backend** | Base44 (`VITE_DATA_BACKEND` defaults to `base44`) |
| **Migration strategy** | **Schema-only** — no Base44 data import |

---

## 2. Git Tags and Rollback Points

| Tag / point | Purpose | Rollback action |
|-------------|---------|-----------------|
| **`boothbridge-base44-final`** | Snapshot of app on Base44 before migration code | Checkout tag or `main` |
| **`main`** | Production-aligned branch before Phase 1 code | `git checkout main` |
| **`c91a472`** | Phase 1 complete | Reset branch if foundation needs redo |
| **Emergency production rollback** | Vercel redeploy + `VITE_DATA_BACKEND=base44` | Until Phase 7.7 cutover signed off |

---

## 3. Completed Phases

| Phase | Status | Deliverable |
|-------|--------|-------------|
| **Audit & planning** | Done | `docs/architecture-audit.md`, `route-map.md`, `entity-relationship-diagram.md`, `base44-dependency-map.md`, `migration-readiness-report.md`, `migration-execution-roadmap.md` |
| **Phase 0 — Baseline** | Done | Tag `boothbridge-base44-final` |
| **Phase 1 — Foundation** | Done (`c91a472`) | `authClient.js`, `storageClient.js`, `aiClient.js`, `supabaseClient.js`, `backend.js`; `dbClient` expanded to 39 entities |
| **Phase 2 — Mechanical refactor** | **Largely complete** | Pages use `db`, `auth`, `storage`, `ai`; zero `base44Client` imports in pages/hooks |
| **Phase 6 — Data track** | **CLOSED** | See §4 below |

---

## 4. Phase 6 — Official Closure

**Data Migration Waiver (2026-07-01)**

| Sub-phase | Status |
|-----------|--------|
| **6C.1** Supabase schema | **COMPLETE** — 39 entity tables in `supabase/migrations/` (43 files) |
| **6C.2** Migration tooling | **COMPLETE** — `scripts/phase6/`, `phase6Export` (archived) |
| **6C.3** Infrastructure validation | **COMPLETE** — tooling verified in repo |
| **6C.4** Data migration | **WAIVED** — demo data only; no production records |
| **6D** Import | **NOT REQUIRED** |

**Reason:** The Base44 database contains only demonstration/test/sample data. No production business data requires preservation. The export/import pipeline is **archived and will not be executed**.

**Archived (do not run):** export pipeline, UUID verification, JSON export, manifest generation, Gates 1–3, import planning. Files preserved with archive banners.

**Canonical record:** [`phase6-master-execution-plan.md`](./phase6-master-execution-plan.md)

---

## 5. Active Phase — Phase 7

**Phase 7 — Complete Supabase Transition** ([`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md))

| Milestone | Goal | Status |
|-----------|------|--------|
| **7.1** | Provision Supabase production project | Not started |
| **7.2** | Apply all migrations (39 tables, indexes, FKs, triggers) | Not started |
| **7.3** | Base44 dependency audit | **Complete** — [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md) |
| **7.4** | Refactor client layer to Supabase | Not started |
| **7.5** | Seed clean demo database (no Base44 records) | Not started |
| **7.6** | End-to-end verification | Not started |
| **7.7** | Production readiness review | Not started |

**Estimated effort:** 4–6 weeks (one senior engineer).

---

## 6. Architecture Decisions (unchanged)

1. **Stay on React 18 + Vite 6** — no Next.js, no TypeScript migration.
2. **Preserve all routes, UI, NFC, QR, OCR, offline sync** — backend swap only behind client modules.
3. **Four client modules + expanded `dbClient`** as the migration seam.
4. **`VITE_DATA_BACKEND=base44|supabase`** env switch until Phase 7.7 cutover.
5. **Dual auth today** → unify on Supabase Auth in Phase 7.4.
6. **dbClient legacy aliases** preserved via Postgres views where needed.
7. **Deploy target:** Vercel static `dist`; Supabase for Postgres, Auth, Storage, Realtime, Edge Functions.
8. **QR/NFC URLs frozen** until explicit payload migration.
9. **Clean Supabase database** — seed new demo data in 7.5; no Base44 import.

---

## 7. Current Backend Status

| Layer | Today |
|-------|--------|
| **Platform** | Base44 (`@base44/sdk` 0.8.32, `@base44/vite-plugin`) |
| **Data access** | Pages → `dbClient` → Base44 SDK (14 files in `src/` still touch Base44 at client layer) |
| **Auth** | `authClient` → `base44.auth` + admin via `adminAuth` function |
| **Storage / AI** | `storageClient` / `aiClient` → `base44.integrations.Core` |
| **Entities** | 39 JSONC schemas in `base44/entities/` (reference) |
| **Supabase schema** | Authored in repo; **not applied** to live project |
| **RLS policies** | Not in migrations yet |
| **Foundation clients** | Imported by all pages; Supabase branches are stubs |

Build: `npm run build` passes with default Base44 backend.

---

## 8. Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Client module Supabase stubs throw | High | Phase 7.4 implementation before cutover |
| RLS policy gaps | Critical | Translate from JSONC; test per role |
| Base44 integrations lock-in (OCR, AI) | Critical | Edge Functions in 7.4 |
| Dual admin auth | High | Admin unification in 7.4 |
| No automated test suite | Medium | Phase 7.6 manual smoke suite |
| Premature `VITE_DATA_BACKEND=supabase` | Medium | Keep default `base44` until 7.7 |

---

## 9. Recommended Next Action

**Phase 7.1 — Provision Supabase production project**

1. Create Supabase project and link via CLI.
2. Configure Auth providers (email, Google, LinkedIn).
3. Create Storage buckets.
4. Document Vercel environment variables.

**Parallel:** Phase 7.2 — apply `supabase/migrations/` once project is linked.

**Do not:** run Phase 6 exports, UUID verification, Gates 1–3, or data import. Those phases are permanently closed unless explicitly reopened.

---

## Documentation Index

| Document | Use |
|----------|-----|
| **`phase7-complete-supabase-transition.md`** | **Active implementation roadmap** |
| **`phase7-base44-dependency-audit.md`** | Remaining Base44 inventory |
| `phase6-master-execution-plan.md` | Phase 6 closure + data waiver |
| `migration-execution-roadmap.md` | Macro phases 0–8 history |
| `architecture-audit.md` | Current system snapshot |
| `base44-dependency-map.md` | Original SDK surface area |
| `phase2-impact-report.md` | Mechanical refactor plan |
| `future-erd-v2.md` | Target Supabase model |
| `scripts/phase6/README.md` | Archived export tooling guide |

---

*End of handoff — update at each Phase 7 milestone.*
