# Phase 7 — Complete Supabase Transition

**Canonical implementation roadmap**  
**Effective:** 2026-07-01 (supersedes macro Phase 7 “production cutover” in [`migration-execution-roadmap.md`](./migration-execution-roadmap.md))  
**Repository:** `booth-bridge`  
**Strategy:** Schema-only migration — **no Base44 data import**

---

## Executive summary

Phase 6 is **closed**. Data migration is **waived** because the Base44 database contains only demonstration/test data. Supabase will start with a **clean database** seeded with new demo datasets in Phase 7.5.

Phase 7 delivers the full application transition:

| Migrate | Do not migrate |
|---------|----------------|
| Application source code | Base44 entity records |
| Postgres schema (39 tables) | Export/import pipeline |
| Business logic (client modules) | UUID verification gates |
| Authentication (Supabase Auth) | `phase6Export` execution |
| Infrastructure (Storage, RLS, Edge Functions) | Base44 demo JSON |

**Prerequisite work already complete:**

| Prior phase | Status |
|-------------|--------|
| Phase 0 — Baseline | Done |
| Phase 1 — Foundation clients | Done |
| Phase 2 — Mechanical refactor | **Largely complete** — pages use `db`, `auth`, `storage`, `ai`; ~14 runtime files still touch Base44 (client layer + logos) |
| Phase 6C.1 — Schema in repo | Complete |
| Phase 6C.2 — Export tooling | Complete (archived, not executed) |
| Phase 6C.3 — Infrastructure validation | Complete (tooling verified in repo) |
| Phase 6C.4 — Data migration | **WAIVED** |
| Phase 6D — Import | **NOT REQUIRED** |

---

## Milestone overview

| Milestone | Name | Est. effort | Depends on |
|-----------|------|-------------|------------|
| **7.1** | Provision Supabase production project | 1–2 days | — |
| **7.2** | Apply all migrations | 1–2 days | 7.1 |
| **7.3** | Base44 dependency audit | 1 day | — (parallel with 7.1) |
| **7.4** | Refactor client layer to Supabase | 10–15 days | 7.1, 7.2 |
| **7.5** | Seed clean demo database | 2–3 days | 7.2, 7.4 (partial) |
| **7.6** | End-to-end verification | 3–5 days | 7.4, 7.5 |
| **7.7** | Production readiness review | 2–3 days | 7.6 |

**Total estimate:** 4–6 weeks with one senior engineer (7.3 and 7.1 can run in parallel).

**Detailed audit:** [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md)

---

## Phase 7.1 — Provision Supabase production project

**Objective:** Create and configure the production Supabase project before any cutover.

### Actions

1. Create Supabase project (production tier appropriate for launch).
2. Link project via `supabase link` (store ref in team secrets, not in repo).
3. Configure **Auth providers:**
   - Email/password with confirmation
   - Google OAuth
   - LinkedIn OAuth
4. Set redirect URLs for Vercel production + preview domains.
5. Create **Storage buckets:**
   - `boothbridge-assets` (private)
   - `boothbridge-media` (private)
   - `boothbridge-ocr` (private)
6. Document environment variables for Vercel and local `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Project API URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key |
| `VITE_DATA_BACKEND` | `supabase` on preview/staging; `base44` until cutover |
| `VITE_AI_ENABLED` | LLM feature flag |
| `VITE_APP_URL` | OAuth redirect base |

7. Deploy Edge Function stubs (can be minimal in 7.1, full impl in 7.4):
   - `admin-auth`
   - `ai-invoke`
   - `ai-extract-document`

### Verification checklist

- [ ] `supabase projects list` shows linked project
- [ ] Auth: test sign-up email received on staging
- [ ] Storage: authenticated upload to each bucket succeeds
- [ ] RLS policies file prepared (apply in 7.2 or alongside migrations)
- [ ] Realtime enabled on `connection`, `meeting` tables (post-migration apply)
- [ ] Service role key stored in team vault (never in Vite bundle)

### Rollback

No production impact — Base44 remains runtime backend.

---

## Phase 7.2 — Apply every migration

**Objective:** Bring Supabase Postgres to parity with `supabase/migrations/` in the repository.

### Migration inventory

| Category | Files | Count |
|----------|-------|-------|
| Extensions | `001_extensions.sql` | 1 |
| Triggers | `002_updated_at_trigger.sql` | 1 |
| Entity tables | `010_user.sql` … `048_stress_test_result.sql` | 39 |
| Indexes | `090_indexes.sql` | 1 |
| Foreign keys / constraints | `091_constraints.sql` | 1 |
| **Total** | | **43** |

### Actions

1. `supabase db push` or `supabase migration up` against linked project.
2. Verify table count: `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'` → expect **39** entity tables (+ any auth-managed tables).
3. Verify extensions: `uuid-ossp`, `pgcrypto` (per `001_extensions.sql`).
4. Verify `updated_at` trigger on all entity tables.
5. Apply RLS policies (new migration `092_rls_policies.sql` — translate from `base44/entities/*.jsonc` `rls` blocks).
6. Spot-check indexes on filter columns (`user_id`, `exhibitor_user_id`, `connection_id`, etc.).
7. Spot-check foreign keys in `091_constraints.sql`.

### Verification checklist

- [ ] 39 entity tables exist with `id uuid` PK
- [ ] `created_date` / `updated_date` columns present (Base44 field names preserved)
- [ ] `legacy_base44_id` column present (unused for clean seed; retained for schema parity)
- [ ] Indexes applied without error
- [ ] FK constraints valid (no orphan references on empty DB)
- [ ] Triggers fire on UPDATE (`updated_date` changes)

### Rollback

`supabase db reset` on staging project; production Base44 unaffected.

---

## Phase 7.3 — Audit repository for Base44 dependencies

**Objective:** Complete inventory of every remaining Base44 touchpoint with replacement strategy and priority.

**Deliverable:** [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md) (maintained through 7.4 completion).

### Summary (2026-07-01 snapshot)

| Category | Files | Priority | Replacement |
|----------|-------|----------|-------------|
| Client modules (runtime) | 5 | **P0** | Supabase branches in `authClient`, `dbClient`, `storageClient`, `aiClient`; delete `base44Client.js` at cutover |
| Build tooling | 1 | **P1** | Remove `@base44/vite-plugin` from `vite.config.js` |
| Package dependencies | 2 | **P0** | Remove `@base44/sdk`, `@base44/vite-plugin` from `package.json` |
| Backend functions | 1 active | **P1** | Replace `adminAuth` with Supabase Edge Function |
| App bootstrap | 2 | **P2** | `app-params.js` → generic token storage; `authClient.checkAppReady()` → static config |
| Service worker | 1 | **P2** | Add `supabase.co` exclusion alongside `base44` |
| Static logo CDN | 5 | **P3** | Re-host logo in Supabase Storage or `/public` |
| Schema reference | `base44/entities/` | **Keep** | Not runtime — reference for RLS translation |
| Phase 6 export (archived) | `scripts/phase6/`, `phase6Export` | **N/A** | Do not execute |

**Phase 2 grep gate status:** Zero `base44Client` imports in `src/pages`, `src/hooks`, `src/lib` (except `app-params.js`). Pages route through foundation clients.

### Estimated remaining engineering

| Workstream | Days |
|------------|------|
| `dbClient` Supabase `makeEntity` | 4–5 |
| `authClient` Supabase Auth + admin | 3–4 |
| `storageClient` + `assetPipeline` | 2 |
| `aiClient` + Edge Functions | 2–3 |
| RLS policy migration | 3–4 |
| Admin session unification | 1–2 |
| Remove Base44 packages + vite plugin | 1 |
| **Subtotal (7.4)** | **16–21** → plan **10–15** with overlap |

---

## Phase 7.4 — Refactor remaining Base44 services

**Objective:** Implement Supabase in the four client modules; remove Base44 as runtime backend.

### 7.4.1 — `dbClient.js` (P0)

| Task | Detail |
|------|--------|
| Implement `makeEntity` Supabase branch | `.from(table).select()`, filter parser, sort string (`-field`), `subscribe` via Realtime |
| Map 39 entities | `ENTITY_TABLE_MAP` already mirrors migrations |
| Test CRUD | All entities used by pages |
| Realtime | `Connection`, `Meeting` — `postgres_changes` filtered subscriptions |

### 7.4.2 — `authClient.js` (P0)

| Task | Detail |
|------|--------|
| `getCurrentUser` | `supabase.auth.getUser()` + join `users` table |
| OAuth | Google, LinkedIn via `signInWithOAuth` |
| Register / OTP / reset | `signUp`, `verifyOtp`, `resetPasswordForEmail` |
| `adminLogin` | Edge Function `admin-auth` or Supabase user with `app_metadata.role=admin` |
| Remove axios public-settings | Static app config or health endpoint |
| Deprecate `bb_admin_authed` | `AdminLayout` guard via `useAuth().role` |

### 7.4.3 — `storageClient.js` + `assetPipeline.js` (P1)

| Task | Detail |
|------|--------|
| `uploadFile` | `supabase.storage.from(bucket).upload()` |
| `getSignedUrl` | `createSignedUrl` |
| Bucket paths | Per `assetPipeline.js` design (events, companies, uploads, scans) |

### 7.4.4 — `aiClient.js` (P1)

| Task | Detail |
|------|--------|
| `invokeLLM` | Edge Function `ai-invoke` |
| `extractFromUploadedFile` | Edge Function `ai-extract-document` |
| Feature flag | `VITE_AI_ENABLED=false` graceful degradation |

### 7.4.5 — Infrastructure (P1)

| Task | Detail |
|------|--------|
| RLS policies | One migration per entity group or consolidated `092_rls_policies.sql` |
| Edge Functions | Deploy `admin-auth`, `ai-invoke`, `ai-extract-document` |
| `vite.config.js` | Remove `@base44/vite-plugin` |
| `public/sw.js` | Exclude `*.supabase.co` from cache |

### 7.4.6 — Cutover prep (P0)

| Task | Detail |
|------|--------|
| Vercel preview | `VITE_DATA_BACKEND=supabase` on preview deployment |
| Full regression | Phase 0 smoke suite on preview |
| Remove `base44Client.js` | After preview passes |
| Remove `@base44/*` packages | After production cutover |

### Verification checklist

- [ ] `VITE_DATA_BACKEND=supabase` — app loads without throw
- [ ] Zero `import` from `@base44/sdk` in `src/` (except transitional client modules until deleted)
- [ ] `npm run build` succeeds without vite plugin
- [ ] All CRUD paths functional on preview

---

## Phase 7.5 — Seed the new database

**Objective:** Populate Supabase with **new** realistic demo data. **Do not** import Base44 records.

### Seed dataset requirements

| Entity group | Minimum seed |
|--------------|--------------|
| Users | 1 admin, 3 exhibitors, 5 buyers (Supabase Auth + `users` rows) |
| Events | 2 active trade shows |
| Exhibitor/Buyer profiles | One per seeded user |
| Booths / Products | 2–3 booths per exhibitor, 5–10 products each |
| Connections | 10 cross-user connections |
| Meetings | 5 pending + 3 accepted |
| NFC profiles | 2 exhibitor NFC badges |
| Catalog items | 3 per exhibitor |
| Notifications | 10 sample notifications |
| Support tickets | 3 open tickets |

### Implementation

1. Create `scripts/phase7/seed-demo.mjs` (or Supabase seed SQL in `supabase/seed.sql`).
2. Use `supabase.auth.admin.createUser` for test accounts.
3. Generate fresh UUIDs — no `legacy_base44_id` population needed.
4. Upload sample images to Storage buckets (not Base44 CDN URLs).
5. Document demo credentials in team vault (not in repo).

### Verification checklist

- [ ] Login works for each seeded role
- [ ] DigitalBooth loads exhibitor with products
- [ ] QR scan flow creates connection against seeded users
- [ ] NFC `/nfc/:userId` resolves seeded profile
- [ ] Admin dashboard shows seeded metrics

---

## Phase 7.6 — End-to-end verification

**Objective:** Confirm all application flows on Supabase preview before production cutover.

### Flow matrix

| Flow | Routes / components | Verify |
|------|---------------------|--------|
| Authentication | Login, Register, Forgot/Reset, OAuth | Email, Google, LinkedIn |
| Onboarding | `/onboarding` | Role selection, profile create, card OCR (if AI enabled) |
| Buyer journey | ScanQR → DigitalBooth → connection | QR payload unchanged |
| Exhibitor journey | RFI inbox, meetings, products | CRUD + realtime |
| OCR | `/ocr-scanner` | Upload → extract → ScannedContact |
| NFC | `/nfc/:userId`, NFCExchange | Profile load, interaction log |
| Offline | `useOfflineSync` | Queue → reconnect → sync |
| Admin | `/admin/*` | RBAC, audit log, global search |
| Storage | Catalog upload/download | Signed URLs |
| AI assistant | DigitalBooth embedded | LLM response (if enabled) |
| Billing | BillingCenter | Read seeded subscriptions |

### Regression gate

All four guardrail features from migration roadmap must pass:

1. QR scan → connection
2. Offline scan → sync
3. OCR business card + badge
4. NFC profile public view

### Verification checklist

- [ ] Phase 0 smoke suite passes on Vercel preview + Supabase
- [ ] Connection + Meeting realtime updates UI
- [ ] No console errors on primary routes
- [ ] Mobile device offline sync tested
- [ ] Compare error rates vs Base44 staging (manual log review)

---

## Phase 7.7 — Production readiness review

**Objective:** Final sign-off checklist before `VITE_DATA_BACKEND=supabase` on production.

### Security

- [ ] RLS enabled on all 39 entity tables
- [ ] RLS policies tested: buyer isolation, exhibitor isolation, admin override
- [ ] Service role key not in client bundle or Vercel `VITE_*` vars
- [ ] Edge Function secrets in Supabase vault only
- [ ] Storage bucket policies: private buckets require auth
- [ ] CSP headers allow Supabase domains (`vercel.json`)
- [ ] Admin access via Supabase Auth roles only (`bb_admin_authed` removed)

### Performance

- [ ] Indexes on high-cardinality filter columns verified (`EXPLAIN` on common queries)
- [ ] Connection list query < 200ms p95 on seeded data
- [ ] Storage signed URL generation < 100ms
- [ ] Edge Function cold start acceptable for OCR/AI

### Storage

- [ ] All buckets created with correct visibility
- [ ] Upload size limits configured
- [ ] CORS allows Vercel origin

### Deployment

- [ ] Vercel production env vars set
- [ ] `vercel.json` SPA rewrites for React Router
- [ ] Deep links work: `/nfc/:userId`, `/admin/leads`
- [ ] Service worker excludes Supabase API from cache

### Monitoring

- [ ] Supabase dashboard alerts: DB CPU, Edge Function errors
- [ ] Vercel Analytics or external APM
- [ ] Error tracking for auth failures post-cutover

### Rollback

- [ ] Vercel instant rollback procedure documented
- [ ] Base44 remains available for 48h emergency fallback (`VITE_DATA_BACKEND=base44`)
- [ ] Rollback does not require data sync (clean Supabase vs demo Base44)

### Cutover sequence

1. Announce maintenance window (optional — SPA hot-swap).
2. Vercel production: `VITE_DATA_BACKEND=supabase`, deploy.
3. Production smoke test (Phase 0 suite).
4. Monitor 24h: auth errors, Edge Function 5xx.
5. Remove `@base44/sdk` and `@base44/vite-plugin` from `package.json`.
6. Archive Base44 project credentials (do not delete until 30-day soak).

---

## Prioritized execution order

```
7.3 (audit) ─────────────────────────────┐
                                          │
7.1 (provision) ──► 7.2 (migrations) ────┼──► 7.4 (client refactor)
                                          │         │
                                          │         ▼
                                          └──► 7.5 (seed demo)
                                                    │
                                                    ▼
                                              7.6 (E2E verify)
                                                    │
                                                    ▼
                                              7.7 (prod readiness)
                                                    │
                                                    ▼
                                              Production cutover
```

**Critical path:** 7.1 → 7.2 → 7.4 → 7.5 → 7.6 → 7.7

**Parallel tracks:**

- 7.3 audit (complete — see dependency audit doc)
- RLS policy authoring (during 7.2–7.4)
- Edge Function development (during 7.4)
- Logo re-hosting (7.4, low priority)

---

## Risk assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| RLS policy gaps expose tenant data | Critical | Medium | Policy review per entity JSONC; automated RLS tests |
| Auth migration breaks OAuth redirects | High | Medium | Test all providers on Vercel preview URLs first |
| Edge Function LLM latency/cost | Medium | High | `VITE_AI_ENABLED` flag; timeout + error UI |
| Offline sync writes fail under RLS | High | Medium | Test `useOfflineSync` with real mobile device |
| Missing `authClient` methods (OTP edge cases) | Medium | Low | Already implemented with Base44 fallbacks; port to Supabase |
| Demo seed insufficient for QA | Low | Medium | Expand seed script iteratively |
| Premature `VITE_DATA_BACKEND=supabase` | Medium | Low | Keep default `base44` until 7.7 sign-off |
| Base44 decommission before soak period | Medium | Low | 48h rollback window; tag `boothbridge-base44-final` preserved |

---

## Definition of done — Base44 independence

- [ ] Zero `import` from `@base44/sdk` or `@base44/vite-plugin` in `src/`
- [ ] Zero runtime `base44.` references outside archived `scripts/phase6/`
- [ ] `VITE_DATA_BACKEND=supabase` on production
- [ ] All routes in [`route-map.md`](./route-map.md) functional
- [ ] Supabase RLS enforces tenant isolation
- [ ] NFC, QR, OCR, offline sync pass production smoke suite
- [ ] Admin access via Supabase Auth roles only
- [ ] Clean demo data in Supabase (no Base44 import)
- [ ] `boothbridge-base44-final` tag preserved for historical reference

---

## Related documents

| Document | Role |
|----------|------|
| [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md) | File-level Base44 inventory |
| [`phase6-master-execution-plan.md`](./phase6-master-execution-plan.md) | Phase 6 closure + data waiver |
| [`migration-execution-roadmap.md`](./migration-execution-roadmap.md) | Macro phases 0–8 history |
| [`project-state-june-2026.md`](./project-state-june-2026.md) | Current project status |
| [`base44-dependency-map.md`](./base44-dependency-map.md) | Original SDK surface area map |
| [`supabase/migrations/`](../supabase/migrations/) | Target schema |

---

*Update this document at each Phase 7 milestone completion.*
