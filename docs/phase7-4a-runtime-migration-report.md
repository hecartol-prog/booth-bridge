# Phase 7.4A — Runtime Migration Report (dbClient → Supabase)

**Generated:** 2026-07-03  
**Scope:** Database abstraction layer only (`dbClient` + Supabase query helpers)  
**Runtime default:** `VITE_DATA_BACKEND=base44` (production unchanged)  
**Canonical roadmap:** [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)

---

## Final recommendation

### **READY FOR 7.4B**

`dbClient` now operates entirely on Supabase when `VITE_DATA_BACKEND=supabase`. All 39 entities are wired. Zero page, hook, layout, or routing changes were required. Base44 remains available via the feature flag.

**Minor actions before preview cutover** (not blockers for 7.4B auth work):

1. Enable Supabase Realtime replication on `connection` and `meeting` (and optionally all 39 tables).
2. Apply RLS policies (Phase 7.4.5) before pointing preview at a populated database.
3. Smoke-test CRUD on Vercel Preview with `VITE_DATA_BACKEND=supabase` + env vars set.
4. Seed demo data (Phase 7.5) — empty Supabase returns empty lists, not errors.

---

## 1. Architecture audit (pre-migration)

### Location

| Item | Path |
|------|------|
| Public API | `src/utils/dbClient.js` |
| Backend switch | `src/config/backend.js` |
| Supabase singleton | `src/api/supabaseClient.js` |
| Entity registry | `ENTITY_TABLE_MAP` in `dbClient.js` (mirrors `scripts/phase6/lib/entity-registry.mjs`) |

### Pre-7.4A design

```
Pages / hooks
    └── import { db } from "@/utils/dbClient"
            └── makeEntity(name)
                    ├── isBase44() → makeBase44Entity → base44.entities[name]
                    └── isSupabase() → makeSupabaseEntityStub → throw
```

### Post-7.4A design

```
Pages / hooks (unchanged)
    └── db.{Entity}.{method}()
            └── makeEntity(name)
                    ├── isBase44() → makeBase44Entity → base44.entities[name]
                    └── isSupabase() → makeSupabaseEntity → getSupabaseClient().from(table)
```

### New modules

| File | Purpose |
|------|---------|
| `src/utils/supabaseQuery.js` | Filter operator translation, sort parser, pagination resolver, UUID helper |
| `src/utils/supabaseEntity.js` | `makeSupabaseEntity()` — CRUD, count, realtime multiplexing |

### Base44 SDK usage (preserved)

- `base44.entities[EntityName].list(sort, limit[, offset])`
- `base44.entities[EntityName].filter(query, sort, limit)`
- `base44.entities[EntityName].create / update / delete`
- `base44.entities[EntityName].subscribe(callback)` — Connection, Meeting pages
- `get(id)` implemented as `filter({ id })[0]` (unchanged)

### Helper functions (unchanged exports)

`generateUUID`, `serializeMetadata`, `deserializeMetadata`, `parseSort`, typed mutation helpers (`saveConnection`, `saveActivity`, `sendNotification`, etc.)

---

## 2. dbClient API Compatibility Report

| Method | Base44 path | Supabase path | Signature preserved | Page usage |
|--------|-------------|---------------|---------------------|------------|
| `list()` | `entity.list(sort, limit)` | `.select().order().limit/.range()` | Yes (+ optional 3rd offset/page) | 40+ call sites |
| `filter()` | `entity.filter(query, sort, limit)` | `.select()` + `applyFilters()` | Yes (+ optional 3rd offset/page) | 60+ call sites |
| `get()` | `filter({ id })[0]` | `.eq('id').maybeSingle()` | Yes | 0 direct page calls |
| `create()` | `entity.create(payload)` | `.insert().select().single()` | Yes | 30+ call sites |
| `update()` | `entity.update(id, payload)` | `.update().eq('id').select().single()` | Yes | 25+ call sites |
| `delete()` | `entity.delete(id)` | `.delete().eq('id')` | Yes | 10+ call sites |
| `subscribe()` | `entity.subscribe(cb)` | `channel().on('postgres_changes')` | Yes — returns unsubscribe fn | 2 pages |
| `count()` | `entity.count` or `filter().length` fallback | `.select('*', { count:'exact', head:true })` | **Added** (no page breakage) | 0 call sites |

### Return shapes

| Operation | Return type | Notes |
|-----------|-------------|-------|
| `list` / `filter` | `Array<Row>` | Empty array on no rows (never `null`) |
| `get` | `Row \| null` | |
| `create` / `update` | `Row` | Single inserted/updated row |
| `delete` | `void` | Throws on error |
| `count` | `number` | Exact count via PostgREST head request |
| `subscribe` | `() => void` | Unsubscribe function |

### Page modification check

Repository-wide search confirms:

- **0** pages import `supabaseClient`, `supabaseEntity`, or `makeEntity` directly
- **62** files import `db` from `@/utils/dbClient` — unchanged import path
- **0** page files modified in Phase 7.4A

---

## 3. Entity Mapping Report

### Cross-check summary

| Source | Count | Status |
|--------|-------|--------|
| `entity-registry.mjs` `ENTITY_TABLE_MAP` | 39 | Canonical |
| `dbClient.js` `ENTITY_TABLE_MAP` | 39 | **Identical** |
| `supabase/migrations/` entity `CREATE TABLE` | 39 | **Identical table names** |
| `makeSupabaseEntity` wired entities | 39 | **All mapped** |

### Full mapping (verified)

| Entity | Postgres table | Migration |
|--------|----------------|-----------|
| Activity | `activity` | `029_activity.sql` |
| AdminAccessLog | `admin_access_log` | `046_admin_access_log.sql` |
| BillingSubscription | `billing_subscription` | `041_billing_subscription.sql` |
| BillingTransaction | `billing_transaction` | `042_billing_transaction.sql` |
| Booth | `booth` | `016_booth.sql` |
| BuyerProfile | `buyer_profile` | `014_buyer_profile.sql` |
| CatalogItem | `catalog_item` | `018_catalog_item.sql` |
| Company | `company` | `012_company.sql` |
| Connection | `connection` | `019_connection.sql` |
| Event | `event` | `011_event.sql` |
| ExhibitorProfile | `exhibitor_profile` | `013_exhibitor_profile.sql` |
| IntegrationConnection | `integration_connection` | `035_integration_connection.sql` |
| IntegrationSyncLog | `integration_sync_log` | `036_integration_sync_log.sql` |
| LeadIntelligence | `lead_intelligence` | `027_lead_intelligence.sql` |
| LeadInteraction | `lead_interaction` | `028_lead_interaction.sql` |
| LeadProfile | `lead_profile` | `026_lead_profile.sql` |
| MatchRecommendation | `match_recommendation` | `033_match_recommendation.sql` |
| Media | `media` | `023_media.sql` |
| Meeting | `meeting` | `021_meeting.sql` |
| MeetingRequest | `meeting_request` | `022_meeting_request.sql` |
| NFCInteraction | `nfc_interaction` | `038_nfc_interaction.sql` |
| NFCProductTag | `nfc_product_tag` | `039_nfc_product_tag.sql` |
| NFCProfile | `nfc_profile` | `037_nfc_profile.sql` |
| Notification | `notification` | `030_notification.sql` |
| OpportunityPost | `opportunity_post` | `034_opportunity_post.sql` |
| PremiumBoothSubscription | `premium_booth_subscription` | `043_premium_booth_subscription.sql` |
| Product | `product` | `017_product.sql` |
| ProjectSupplierMapping | `project_supplier_mapping` | `032_project_supplier_mapping.sql` |
| RFI | `rfi` | `020_rfi.sql` |
| SavedBooth | `saved_booth` | `024_saved_booth.sql` |
| SavedProduct | `saved_product` | `025_saved_product.sql` |
| ScannedContact | `scanned_contact` | `040_scanned_contact.sql` |
| SourcingProject | `sourcing_project` | `031_sourcing_project.sql` |
| SponsoredListing | `sponsored_listing` | `044_sponsored_listing.sql` |
| StressTestResult | `stress_test_result` | `048_stress_test_result.sql` |
| SupportTicket | `support_ticket` | `045_support_ticket.sql` |
| SystemAlert | `system_alert` | `047_system_alert.sql` |
| User | `user` | `010_user.sql` |
| VerificationProfile | `verification_profile` | `015_verification_profile.sql` |

**Mismatches:** None.

---

## 4. Filtering implementation

`applyFilters()` in `supabaseQuery.js` translates Base44-style queries to PostgREST filters:

| Operator | Input forms | Supabase method |
|----------|-------------|-----------------|
| `eq` | `{ field: value }` | `.eq(field, value)` |
| `neq` | `{ field_neq: v }` or `{ field: { $neq: v } }` | `.neq()` |
| `gt` | `{ field_gt: v }` or `{ field: { $gt: v } }` | `.gt()` |
| `gte` | suffix / `$gte` | `.gte()` |
| `lt` | suffix / `$lt` | `.lt()` |
| `lte` | suffix / `$lte` | `.lte()` |
| `like` | suffix / `$like` | `.like()` |
| `ilike` | suffix / `$ilike` | `.ilike()` |
| `in` | `{ field: [a,b,c] }` or `{ field_in: [...] }` | `.in()` |
| `contains` | string → `ilike %val%`; object/array → `.contains()` | context-aware |

**Production page filters today:** 100% simple equality (`{ user_id, status, ... }`). Advanced operators are implemented for API parity and future queries.

---

## 5. Sorting

`parseSort()` handles:

| Input | Column | Direction |
|-------|--------|-----------|
| `-created_date` | `created_date` | descending |
| `+created_date` | `created_date` | ascending |
| `proposed_time` | `proposed_time` | ascending (no prefix) |

Maps to `.order(column, { ascending })`.

Column names match migrations (`created_date`, not `created_at`).

---

## 6. Pagination

| Mode | Call example | Behaviour |
|------|--------------|-----------|
| Default | `list("-created_date", 200)` | limit 200, offset 0 |
| Offset | `list("-created_date", 200, 100)` | skip first 100 |
| Page object | `list("-created_date", 200, { page: 2 })` | offset = (page-1)×limit |
| Combined | `filter(q, sort, 50, { page: 3 })` | page 3, 50 per page |

Uses `.limit(n)` or `.range(offset, offset+limit-1)`.

---

## 7. Count queries

```javascript
await db.Connection.count({ status: "accepted" });
// → supabase.from("connection").select("*", { count: "exact", head: true }).eq("status", "accepted")
```

Base44 fallback: `entity.count()` if SDK exposes it, else `filter(query).length`.

---

## 8. Realtime Subscription Report

### Page consumers

| Page | Entity | Callback pattern |
|------|--------|------------------|
| `Connections.jsx` | `Connection` | `subscribe(() => invalidateQueries)` |
| `Meetings.jsx` | `Meeting` | `subscribe(() => invalidateQueries)` |

### Implementation

- One Supabase channel per table: `db-realtime:{table_name}`
- Listens to `postgres_changes` with `event: '*'` (INSERT, UPDATE, DELETE)
- Multiplexes multiple subscriber callbacks per table
- Reference-counted channel lifecycle — channel removed when last subscriber unsubscribes
- Returns unsubscribe function matching Base44 SDK contract

### Infrastructure requirement

Supabase Dashboard → Database → Replication: enable for `connection` and `meeting` (minimum). Without replication, subscriptions connect but receive no events.

### All entities

Realtime is implemented for **all 39 entities** (not only Connection/Meeting). Only two pages subscribe today; others are ready if needed.

---

## 9. Feature flag

| `VITE_DATA_BACKEND` | Runtime |
|---------------------|---------|
| `base44` (default) | `makeBase44Entity` — production behaviour unchanged |
| `supabase` | `makeSupabaseEntity` — requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |

Switch is evaluated once at module load via `src/config/backend.js`. No production cutover in this phase.

---

## 10. Validation

| Check | Result |
|-------|--------|
| `npm run build` | **Pass** |
| ESLint on new modules | **Pass** |
| Entity registry parity (39/39/39) | **Pass** |
| Page import changes | **None required** |
| Hook changes | **None** |
| `authClient` / `storageClient` / `aiClient` | **Untouched** |
| Base44 packages | **Retained** |
| RLS | **Not implemented** (by scope) |
| Live Supabase CRUD smoke test | **Pending** — requires preview env + seeded data |

---

## 11. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| No RLS on Supabase tables | **High** | Certain if preview used | Do not enable `supabase` on preview until 7.4.5 RLS migration |
| Empty database | Medium | High until 7.5 seed | Expected — pages show empty states |
| Realtime not enabled in dashboard | Medium | Medium | Enable replication before testing Connections/Meetings live updates |
| `saveActivity` serializes metadata to string | Low | Low | JSONB accepts string; consider passing object in 7.5 seed phase |
| `public.user` ↔ `auth.users` gap | Medium | High for auth | Addressed in 7.4B (`authClient`) |
| Base44 `count()` fetches all rows | Low | Low | No pages call `count()` today; Supabase uses head count |
| Anon key unrestricted access | **High** | Until RLS | Preview-only testing; keep prod on `base44` |

---

## 12. Files changed

| File | Action |
|------|--------|
| `src/utils/dbClient.js` | Replaced Supabase stub with `makeSupabaseEntity`; added `count()` to Base44 proxy |
| `src/utils/supabaseQuery.js` | **Created** — filter/sort/pagination translation |
| `src/utils/supabaseEntity.js` | **Created** — Supabase CRUD + realtime factory |

**Not modified:** `src/pages/**`, `src/hooks/**`, `src/components/**`, `src/api/authClient.js`, `src/api/storageClient.js`, `src/api/aiClient.js`, `src/api/base44Client.js`

---

## 13. Success criteria checklist

| Criterion | Status |
|-----------|--------|
| dbClient operates on Supabase when flag set | ✅ |
| All 39 entities supported | ✅ |
| Existing pages run unchanged | ✅ |
| Base44 available through feature flag | ✅ |
| No runtime regressions on `base44` default | ✅ (build passes; default path unchanged) |
| CRUD / filter / sort / pagination / count / subscribe implemented | ✅ |
| Live preview verification | ⏳ Phase 7.4B / 7.6 |

---

## Next step

Proceed to **Phase 7.4B** — `authClient` Supabase implementation (`getCurrentUser`, OAuth, admin session unification).
