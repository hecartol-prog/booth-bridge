# BoothBridge Project State — June 2026

**Handoff document for Base44 → Supabase migration**  
**Date:** June 2026  
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
| **Working tree** | Clean for code; **3 docs untracked** (see §10) |
| **Runtime backend** | Base44 (`VITE_DATA_BACKEND` defaults to `base44`) |
| **App behavior** | Identical to pre-migration; no user-facing changes yet |

Commits ahead of `main`: 2 (`dd301c3`, `c91a472` on migration branch).

---

## 2. Git Tags and Rollback Points

| Tag / point | Purpose | Rollback action |
|-------------|---------|-----------------|
| **`boothbridge-base44-final`** | Snapshot of app on Base44 before migration code (on `main`, pushed to origin) | Checkout tag or `main` for last known Base44-only app |
| **`main`** | Production-aligned branch before Phase 1 code | `git checkout main` |
| **`c91a472`** | Phase 1 complete — foundation clients + expanded `dbClient` | Reset branch to this commit if Phase 2 needs redo |
| **Pre-migration app** | No Supabase wiring in pages; foundation modules exist but unused | Safe baseline for Phase 2 mechanical refactor |

**Emergency production rollback (future):** Vercel redeploy previous build + `VITE_DATA_BACKEND=base44` until Supabase cutover is signed off.

---

## 3. Completed Phases

| Phase | Status | Deliverable |
|-------|--------|-------------|
| **Audit & planning** | Done (committed on migration branch) | `docs/architecture-audit.md`, `route-map.md`, `entity-relationship-diagram.md`, `base44-dependency-map.md`, `migration-readiness-report.md`, `migration-execution-roadmap.md` |
| **Phase 0 — Baseline** | Done | Tag `boothbridge-base44-final`; smoke-test checklist in roadmap |
| **Phase 1 — Foundation** | Done (`c91a472`) | `authClient.js`, `storageClient.js`, `aiClient.js`, `supabaseClient.js`, `backend.js`; `dbClient` expanded to 39 entities; `@supabase/supabase-js` installed; `docs/phase1-foundation-report.md` |

**Not started:** Phase 2+ (no page import swaps, no Supabase schema, no auth/storage migration).

---

## 4. Remaining Phases

| Phase | Goal | Est. effort |
|-------|------|-------------|
| **2** | Mechanical refactor: pages/hooks → `db`, `auth`, `storage`, `ai` (still Base44) | ~3–5 days |
| **3** | Supabase provision: schema, RLS, Storage, Edge Functions | ~5–10 days |
| **4** | Wire client modules to Supabase on staging/Vercel preview | ~5–7 days |
| **5** | Auth + admin unification (drop `bb_admin_authed` session) | ~3–5 days |
| **6** | Base44 data import (ID-preserving) | ~3–7 days |
| **7** | Production cutover; remove `@base44/sdk` | ~2–3 days |
| **8** | Vercel hardening (`vercel.json`, monitoring) | ~1–2 days |

Detail: `docs/migration-execution-roadmap.md`, `docs/phase2-impact-report.md`.

---

## 5. Architecture Decisions Already Approved

1. **Stay on React 18 + Vite 6** — no Next.js, no TypeScript migration.
2. **Preserve all routes, UI, NFC, QR, OCR, offline sync** — backend swap only behind client modules.
3. **Four client modules + expanded `dbClient`** as the only migration seam (`auth`, `storage`, `ai`, `db`).
4. **`VITE_DATA_BACKEND=base44|supabase`** env switch; default remains `base44` until cutover.
5. **Dual auth today** (Base44 user auth + separate admin session) → unify on Supabase Auth in Phase 5.
6. **dbClient legacy aliases** — keep `db.Event`, `db.RFI`, `db.SourcingProject`, etc. via Postgres views so pages need not rename entities.
7. **RelationshipTimeline = event stream only** — not a second source of truth for Meeting, Quote, Opportunity, or CommercialProject (`future-erd-v2.md` §3.3).
8. **Deploy target:** Vercel static `dist`; Supabase for Postgres, Auth, Storage, Realtime, Edge Functions.
9. **QR/NFC URLs frozen** until explicit payload migration (`boothbridge:connect:{userId}:{role}`, `/nfc/:userId`).

---

## 6. Future ERD Summary (v2)

Long-term model in `docs/future-erd-v2.md` (v2.1):

**Business contexts (8):** trade shows, Yiwu markets, wholesale markets, permanent showrooms, factory visits, business missions, distributor visits, supplier visits.

**Physical hierarchy:** `Location → Booth → Company → Contact`

**Operational lifecycle:** `VisitContext → Booth → Contact → Connection → Opportunity → Quote → CommercialProject` (+ Meeting, Catalog as branches).

**Core + strategic entities:** Company, Booth, VisitContext, Contact, Connection, RelationshipTimeline (event log), Meeting, Catalog, Quote, CommercialProject, Location, OrganizationMembership, Opportunity.

**Key merges from today:** Event→VisitContext, RFI→Quote, CatalogItem→Catalog, SourcingProject→CommercialProject, contact fragments→Contact, Activity/LeadInteraction→Timeline events.

Earlier v1 narrative: `docs/future-data-model.md`.

---

## 7. Current Backend Status

| Layer | Today |
|-------|--------|
| **Platform** | Base44 (`@base44/sdk` 0.8.32, `@base44/vite-plugin`) |
| **App ID** | `6a1efdb97246f738e8422e59` |
| **Data access** | ~65 files still import `base44Client` directly; `dbClient` used in 5 files only |
| **Auth** | `base44.auth` + `AuthContext`; admin via `adminAuth` function + `sessionStorage bb_admin_authed` |
| **Storage / AI** | `base44.integrations.Core` (UploadFile, InvokeLLM, ExtractDataFromUploadedFile, CreateFileSignedUrl) |
| **Entities** | 39 JSONC schemas in `base44/entities/` |
| **Realtime** | `Connection.subscribe`, `Meeting.subscribe` (2 pages) |
| **Offline** | IndexedDB queues + `useOfflineSync` → still calls `base44.entities` |
| **Foundation clients** | Created in Phase 1 but **not imported by pages** |

Build: `npm run build` passes with default Base44 backend.

---

## 8. Supabase Migration Status

| Area | Status |
|------|--------|
| **Supabase project** | Not provisioned in repo / docs |
| **Postgres schema** | Not created — design in `future-erd-v2.md` |
| **RLS policies** | Designed, not implemented |
| **Storage buckets** | Paths documented in `assetPipeline.js` / ERD v2 |
| **Edge Functions** | Planned: `admin-auth`, `ai-invoke`, `ai-extract-document` |
| **Client SDK** | `@supabase/supabase-js` installed; `supabaseClient.js` lazy-init only when `VITE_DATA_BACKEND=supabase` |
| **dbClient Supabase path** | Stub — throws until Phase 4 |
| **Data export/import** | No scripts; ID-preserving import planned Phase 6 |
| **Vercel** | Not configured for migration env vars yet |

---

## 9. Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| ~65 files still on direct `base44` imports | High | Phase 2 mechanical swap + grep gates |
| `authClient` gaps (`setToken`, `resendOtp`, `resetPassword`) | High | Extend before Register/ResetPassword refactor |
| Base44 integrations lock-in (OCR, AI, uploads) | Critical | `storageClient` + `aiClient` + Edge Functions in Phase 4 |
| Dual admin auth | High | Phase 5 unified RBAC |
| Timeline vs operational entity confusion | Medium | ERD v2 §3.3 — write operational row first, then event |
| No automated test suite | Medium | Phase 0/2 manual smoke checklist |
| Untracked docs may be lost if not committed | Low | Commit `future-erd-v2.md`, `phase2-impact-report.md`, `future-data-model.md` |
| Setting `VITE_DATA_BACKEND=supabase` prematurely | Medium | Stubs throw; keep default `base44` |

---

## 10. Recommended Next Action

**Immediate (1–2 hours)**

1. Commit untracked docs: `future-data-model.md`, `future-erd-v2.md`, `phase2-impact-report.md`.
2. Extend `authClient.js` with `setToken`, `resendOtp`, `resetPassword` (object signatures used by `Register.jsx` / `ResetPassword.jsx`).

**Next phase (Phase 2)**

3. Execute mechanical import refactor per `docs/phase2-impact-report.md` Batch order: utilities/hooks → auth → admin pages → feature pages → NFC/QR/OCR last.
4. Run grep gates: zero `base44` in `src/pages`, `src/lib`, `src/hooks`, `src/components`.
5. Full Phase 0 smoke test on Base44 after Phase 2 completes.

**Do not** set `VITE_DATA_BACKEND=supabase` or provision Supabase schema until Phase 2 regression passes.

---

## Documentation Index

| Document | Use |
|----------|-----|
| `architecture-audit.md` | Current system snapshot |
| `migration-execution-roadmap.md` | Phased plan with rollback/testing |
| `phase1-foundation-report.md` | Phase 1 deliverables |
| `phase2-impact-report.md` | Phase 2 file list and batches |
| `future-erd-v2.md` | Target Supabase model (v2.1) |
| `future-data-model.md` | Target model v1 |
| `base44-dependency-map.md` | SDK surface area |
| `route-map.md` | All routes and guards |
| `migration-readiness-report.md` | Risks and reusable modules |

---

*End of handoff — keep this file updated at each phase completion.*
