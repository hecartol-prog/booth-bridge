# Phase 7.2 — Migration Execution Report

**Generated:** 2026-07-02  
**Milestone:** 7.2 — Apply every migration  
**Canonical roadmap:** [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)  
**Linked project:** `jjqhmvfzqpohvukoxeoe` (Booth Bridge App)  
**Runtime backend:** Base44 (unchanged)

---

## Final recommendation

### **NOT READY**

Remote schema migration **did not execute**. The Supabase CLI and MCP server lack authentication on this workstation (`SUPABASE_ACCESS_TOKEN` unset; `npx supabase db push --linked` failed).

**Repository static validation passes** — all 43 migrations are well-ordered, idempotent at the file level, and consistent with `entity-registry.mjs` and `dbClient.js`. Apply migrations after authentication, then re-run live validation queries in §8.

---

## 1. Migration execution summary

| Step | Status | Detail |
|------|--------|--------|
| CLI version | Pass | `npx supabase@2.109.0` |
| CLI login | **Fail** | Access token not provided |
| MCP `list_migrations` | **Fail** | Permission denied |
| `supabase db push --linked` | **Fail** | Blocked by missing access token |
| Local `supabase db reset` | **Not run** | Docker not installed on workstation |
| Migrations applied remotely | **No** | Live database state unverified |

### Execution command (run after `npx supabase login`)

```bash
npx supabase link --project-ref jjqhmvfzqpohvukoxeoe
npx supabase db push --linked
npx supabase migration list --linked   # expect 43 entries
```

### Chronological migration inventory

| Order | File | Purpose |
|-------|------|---------|
| 1 | `001_extensions.sql` | `pgcrypto` extension |
| 2 | `002_updated_at_trigger.sql` | `set_updated_date()` function |
| 3–41 | `010_user.sql` … `048_stress_test_result.sql` | 39 entity tables + per-table triggers |
| 42 | `090_indexes.sql` | 100 indexes |
| 43 | `091_constraints.sql` | 99 FK constraints + 1 unique constraint |

**Total:** 43 files — ordering is correct (extensions → function → tables → indexes → FKs).

---

## 2. Schema validation report (static — repository)

Static analysis of migration SQL. Live checks marked **pending** until `db push` succeeds.

| Check | Expected | Static result | Live status |
|-------|----------|---------------|-------------|
| Entity tables | 39 | **39** `CREATE TABLE` in `public` | Pending |
| Extensions | `pgcrypto` | **1** (`gen_random_uuid`) | Pending |
| `uuid-ossp` | Not required | Absent (correct) | Pending |
| Primary keys | `id uuid` on all entities | **39/39** | Pending |
| UUID default | `gen_random_uuid()` | **39/39** | Pending |
| `created_date` | `timestamptz NOT NULL DEFAULT now()` | **39/39** | Pending |
| `updated_date` | `timestamptz` nullable | **39/39** | Pending |
| `created_at` / `updated_at` | Must not exist | **0** occurrences | Pending |
| `legacy_base44_id` | Present for parity | **39/39** | Pending |
| `updated_date` triggers | One per entity table | **39** triggers | Pending |
| Indexes | On filter/FK columns | **100** `CREATE INDEX IF NOT EXISTS` | Pending |
| Foreign keys | Cross-table integrity | **99** FK + **1** unique | Pending |
| RLS policies | Not in scope (7.2) | **0** (expected) | Pending |

### Live validation queries (run after `db push`)

```sql
-- Table count
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expect: 39

-- Extensions
SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';

-- UUID default smoke test
INSERT INTO "public"."event" ("name") VALUES ('schema-test') RETURNING id, created_date;
DELETE FROM "public"."event" WHERE name = 'schema-test';

-- Trigger smoke test
UPDATE "public"."event" SET name = 'trigger-test' WHERE name = 'schema-test';
-- updated_date should change on any row UPDATE
```

---

## 3. Entity consistency report

Cross-check: `scripts/phase6/lib/entity-registry.mjs` ↔ `src/utils/dbClient.js` ↔ `supabase/migrations/`.

### Registry parity

| Source | Entity count | Match |
|--------|--------------|-------|
| `entity-registry.mjs` `ENTITY_TABLE_MAP` | 39 | — |
| `dbClient.js` `ENTITY_TABLE_MAP` | 39 | **Identical** |
| Migration `CREATE TABLE` statements | 39 | **Identical table names** |

### Entity → table mapping (all match)

| Entity (PascalCase) | Postgres table | Migration file |
|---------------------|----------------|----------------|
| User | `user` | `010_user.sql` |
| Event | `event` | `011_event.sql` |
| Company | `company` | `012_company.sql` |
| ExhibitorProfile | `exhibitor_profile` | `013_exhibitor_profile.sql` |
| BuyerProfile | `buyer_profile` | `014_buyer_profile.sql` |
| VerificationProfile | `verification_profile` | `015_verification_profile.sql` |
| Booth | `booth` | `016_booth.sql` |
| Product | `product` | `017_product.sql` |
| CatalogItem | `catalog_item` | `018_catalog_item.sql` |
| Connection | `connection` | `019_connection.sql` |
| RFI | `rfi` | `020_rfi.sql` |
| Meeting | `meeting` | `021_meeting.sql` |
| MeetingRequest | `meeting_request` | `022_meeting_request.sql` |
| Media | `media` | `023_media.sql` |
| SavedBooth | `saved_booth` | `024_saved_booth.sql` |
| SavedProduct | `saved_product` | `025_saved_product.sql` |
| LeadProfile | `lead_profile` | `026_lead_profile.sql` |
| LeadIntelligence | `lead_intelligence` | `027_lead_intelligence.sql` |
| LeadInteraction | `lead_interaction` | `028_lead_interaction.sql` |
| Activity | `activity` | `029_activity.sql` |
| Notification | `notification` | `030_notification.sql` |
| SourcingProject | `sourcing_project` | `031_sourcing_project.sql` |
| ProjectSupplierMapping | `project_supplier_mapping` | `032_project_supplier_mapping.sql` |
| MatchRecommendation | `match_recommendation` | `033_match_recommendation.sql` |
| OpportunityPost | `opportunity_post` | `034_opportunity_post.sql` |
| IntegrationConnection | `integration_connection` | `035_integration_connection.sql` |
| IntegrationSyncLog | `integration_sync_log` | `036_integration_sync_log.sql` |
| NFCProfile | `nfc_profile` | `037_nfc_profile.sql` |
| NFCInteraction | `nfc_interaction` | `038_nfc_interaction.sql` |
| NFCProductTag | `nfc_product_tag` | `039_nfc_product_tag.sql` |
| ScannedContact | `scanned_contact` | `040_scanned_contact.sql` |
| BillingSubscription | `billing_subscription` | `041_billing_subscription.sql` |
| BillingTransaction | `billing_transaction` | `042_billing_transaction.sql` |
| PremiumBoothSubscription | `premium_booth_subscription` | `043_premium_booth_subscription.sql` |
| SponsoredListing | `sponsored_listing` | `044_sponsored_listing.sql` |
| SupportTicket | `support_ticket` | `045_support_ticket.sql` |
| AdminAccessLog | `admin_access_log` | `046_admin_access_log.sql` |
| SystemAlert | `system_alert` | `047_system_alert.sql` |
| StressTestResult | `stress_test_result` | `048_stress_test_result.sql` |

### Mismatches identified

| Item | Severity | Detail |
|------|----------|--------|
| `public.user` ↔ `auth.users` | **Design gap** | No FK; IDs must sync in Phase 7.4/7.5 — not a migration error |
| `user.profile_id` | **Minor** | Indexed (`idx_user_profile_id`) but no FK — polymorphic profile reference |
| Phase 7 audit doc | None | [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md) references client layer only; no table-name conflicts |

**Entity consistency verdict:** **PASS** (repository sources aligned).

---

## 4. Relationship audit

### 4.1 Foreign key graph summary

- **99** foreign key constraints in `091_constraints.sql`
- **1** unique constraint: `uq_nfc_profile_nfc_identifier`
- All FKs use `ON DELETE SET NULL` + `DEFERRABLE INITIALLY DEFERRED`
- Root tables (no incoming FKs in `091`): `user`, `event`
- Standalone admin tables (no FKs): `system_alert`, `stress_test_result`

### 4.2 Hub tables (most referenced)

| Table | Incoming FK count (approx.) |
|-------|----------------------------|
| `user` | ~45 |
| `event` | ~15 |
| `company` | ~10 |
| `exhibitor_profile` | ~10 |
| `connection` | ~5 |

### 4.3 Orphan tables

**None** — all 39 tables are either roots, FK targets, or FK sources. `system_alert` and `stress_test_result` are intentionally isolated (admin diagnostics).

### 4.4 Missing FK (notable)

| Column | Table | Notes |
|--------|-------|-------|
| `profile_id` | `user` | No FK — may point to exhibitor or buyer profile depending on `user_role` |
| `*` | `auth.users` | No bridge to `public.user` — required for Supabase Auth integration in 7.4 |
| — | `system_alert` | No relational deps (by design) |
| — | `stress_test_result` | No relational deps (by design) |

### 4.5 Duplicate relationships

**None detected** — each FK has a unique constraint name (`fk_<table>_<column>` pattern).

### 4.6 Cyclic dependencies

**No hard cycles** — all FKs are deferrable; table creation order 010→048 does not require circular DDL. Runtime cycles exist in the entity graph (e.g. `connection` ↔ `meeting` ↔ `meeting_request`) but are valid with nullable FKs and deferred constraints.

### 4.7 Unexpected nullable columns

Most FK columns are nullable (`uuid` without `NOT NULL`) — matches Base44 schema parity and allows partial records during onboarding. **Expected**, not a defect.

Notable nullable non-FK columns with defaults preserved from Base44:

| Column | Default | Tables |
|--------|---------|--------|
| `onboarded` | `false` | `user` |
| `severity` | `'info'` | `system_alert` |
| `status` | various | multiple entities |

### 4.8 Incorrect defaults

**None found** in static review. All PKs use `gen_random_uuid()`; `created_date` defaults to `now()`.

---

## 5. Security foundation (pre-RLS)

RLS is **not implemented** per Phase 7.2 constraints. Assessment of readiness:

| Check | Status | Notes |
|-------|--------|-------|
| Tables in exposed `public` schema | 39 tables | Supabase API can reach them once RLS is off |
| RLS enabled | **No** | Required in `092_rls_policies.sql` (Phase 7.2 roadmap item or 7.4) |
| `anon` role behavior | **Unrestricted until RLS** | Do not set `VITE_DATA_BACKEND=supabase` on preview until RLS applied |
| `service_role` bypass | Standard | Bypasses RLS when policies exist — server-only |
| `auth.users` compatibility | **Gap** | `public.user` is separate; 7.4 must join on shared UUID |
| `set_updated_date` in public | Acceptable | Trigger function; not `SECURITY DEFINER` risk |
| Sensitive columns | `legacy_base44_id`, `metadata` jsonb | RLS policies must scope by `user_id` / tenant |

**Security foundation verdict:** Schema is **structurally ready** for RLS policies, but **not safe for public API exposure** until `092_rls_policies.sql` is applied.

---

## 6. Migration health report

### 6.1 Idempotency

| Construct | Idempotent? | Notes |
|-----------|-------------|-------|
| `CREATE EXTENSION IF NOT EXISTS` | Yes | `001` |
| `CREATE TABLE IF NOT EXISTS` | Yes | All entity migrations |
| `CREATE INDEX IF NOT EXISTS` | Yes | `090` |
| `CREATE OR REPLACE FUNCTION` | Yes | `002` |
| `ALTER TABLE ADD CONSTRAINT` | **No** | `091` — runs once via migration history (correct) |
| `CREATE TRIGGER` | **No** | Per-table files — runs once (correct) |

**Verdict:** Appropriate for Supabase migration runner. Re-applying `091` on an already-constrained DB would error — expected behavior.

### 6.2 Migration history

| Item | Status |
|------|--------|
| Remote `supabase_migrations.schema_migrations` | **Not verified** — push blocked |
| Local migration files | 43 files, lexicographic order correct |
| Naming convention | `<seq>_<name>.sql` — consistent |
| `config.toml` | Created via `supabase init` during 7.2; `major_version = 17` matches linked project |

### 6.3 Reproducibility (`supabase db reset`)

| Requirement | Status |
|-------------|--------|
| Fresh schema from migrations only | **Designed correctly** |
| Verified on this workstation | **No** — Docker unavailable |
| Verified on linked remote | **No** — push blocked |

**Recommended verification** (any machine with Docker + CLI auth):

```bash
npx supabase start
npx supabase db reset
npx supabase migration list --local   # 43 applied
```

### 6.4 Ordering / dependency analysis

| Dependency | Satisfied? |
|------------|------------|
| `pgcrypto` before `gen_random_uuid()` | Yes (`001` before `010`) |
| `set_updated_date()` before triggers | Yes (`002` before `010`) |
| Tables before indexes | Yes (`010–048` before `090`) |
| Tables before FKs | Yes (`010–048` before `091`) |
| Referenced tables before FK targets | Yes (e.g. `user`, `event` created early) |

**No ordering issues detected** in static analysis.

---

## 7. Risk assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Migrations never applied to remote | **Critical** | **Current** | `npx supabase login` → `db push` |
| Public API exposed without RLS | Critical | High after push | Apply `092_rls_policies.sql` before preview |
| `public.user` ≠ `auth.users` ID drift | High | Medium | Sync in 7.4 auth + 7.5 seed |
| `user.profile_id` without FK | Low | Low | Document polymorphic semantics in RLS |
| Local reproducibility unverified | Medium | Medium | Run `db reset` on Docker host |
| Reserved table name `user` | Low | Low | Quoted identifiers used throughout |
| Deferred FKs hide ordering bugs | Low | Low | Empty DB apply should succeed |
| CLI token not on CI | Medium | High | Add `SUPABASE_ACCESS_TOKEN` to CI vault |

---

## 8. Post-push validation checklist

Run after successful `npx supabase db push --linked`:

- [ ] `migration list --linked` shows 43 migrations
- [ ] `SELECT count(*) ...` → 39 public tables
- [ ] `pgcrypto` extension enabled
- [ ] Sample INSERT returns UUID + `created_date`
- [ ] UPDATE sets `updated_date` via trigger
- [ ] `090_indexes`: 100 indexes present (`pg_indexes`)
- [ ] `091_constraints`: 100 constraints present (`information_schema.table_constraints`)
- [ ] Enable Realtime on `connection`, `meeting` (dashboard — Phase 7.2 roadmap)
- [ ] Update this report: change recommendation to **READY FOR PHASE 7.3** or **READY WITH MINOR ACTIONS**

---

## 9. Investigation limitations

| Blocker | Impact |
|---------|--------|
| No `SUPABASE_ACCESS_TOKEN` / `supabase login` | Remote push and live validation impossible |
| Supabase MCP permission denied | Could not use `execute_sql` or `list_migrations` |
| Docker not installed | Local `supabase db reset` not executed |
| No `.env` with DB password | Direct `psql` connection not attempted |

---

## 10. Infrastructure changes during 7.2

| File | Change | Notes |
|------|--------|-------|
| `supabase/config.toml` | **Added** | Created by `supabase init`; `major_version = 17`; required for local workflow |
| Application code | **None** | Per constraints |
| Migration SQL | **None** | Per constraints |
| RLS | **None** | Per constraints |

---

## Related documents

| Document | Role |
|----------|------|
| [`phase7-infrastructure-readiness-report.md`](./phase7-infrastructure-readiness-report.md) | Phase 7.1 output |
| [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md) | Canonical roadmap |
| [`phase7-base44-dependency-audit.md`](./phase7-base44-dependency-audit.md) | Client audit (7.3 complete) |
| [`supabase/migrations/`](../supabase/migrations/) | Schema source of truth |

---

*Re-run live validation after `db push` and update the final recommendation.*
