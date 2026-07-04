# Phase 7.4A Verification Report — dbClient Migration Audit

**Date:** 2026-07-03  
**Mode:** Read-only audit (no source changes)  
**Auditor:** Automated gate review against Phase 7.4A specification

---

## Final verdict

### **PASS WITH MINOR FIXES**

The Supabase implementation is structurally complete, entity-complete (39/39), page-compatible, and correctly gated by `VITE_DATA_BACKEND`. It is **ready to proceed to Phase 7.4B** (`authClient`).

It is **not yet production-cutover-ready** (RLS, auth, seeded data, live Supabase smoke tests remain out of scope for 7.4A).

---

## File location note

The audit brief references `src/api/dbClient.js`. **That file does not exist.** The canonical implementation is:

| Expected | Actual |
|----------|--------|
| `src/api/dbClient.js` | **`src/utils/dbClient.js`** |
| — | `src/utils/supabaseEntity.js` |
| — | `src/utils/supabaseQuery.js` |
| `src/api/supabaseClient.js` | ✅ Correct |

---

## 1. API Compatibility Matrix

Every entity is constructed via `makeEntity()` → `makeBase44Entity()` or `makeSupabaseEntity()`. Both factories return the same method surface.

| Method | Base44 path | Supabase path | Return shape | Page usage |
|--------|-------------|---------------|--------------|------------|
| `list(sort?, limit?, pagination?)` | `entity.list(...)` | `.select('*').order().limit/.range()` | `Array` | ✅ Heavy |
| `filter(query, sort?, limit?, pagination?)` | `entity.filter(...)` | `.select('*')` + `applyFilters()` | `Array` | ✅ Heavy (60+ sites) |
| `get(id)` | `filter({id})[0]` | `.eq('id').maybeSingle()` | `Row \| null` | ✅ 0 direct calls |
| `create(payload)` | `entity.create()` | `.insert().select().single()` | `Row` | ✅ Heavy |
| `update(id, payload)` | `entity.update()` | `.update().eq('id').select().single()` | `Row` | ✅ Heavy |
| `delete(id)` | `entity.delete()` | `.delete().eq('id')` | `void` | ✅ Moderate |
| `count(query?)` | `entity.count()` or `filter().length` | `.select('*', {count:'exact', head:true})` | `number` | ✅ 0 calls (new) |
| `subscribe(callback)` | `entity.subscribe()` | `channel().on('postgres_changes')` | `() => void` | ✅ 2 pages |

### Compatibility notes

| Item | Status |
|------|--------|
| All 7 required methods on every entity | ✅ |
| `filter()` preserved (pre-existing, required by pages) | ✅ |
| `get()` uses `.maybeSingle()` not `.single()` | ⚠️ Minor — avoids throw on missing row; return shape matches Base44 proxy |
| `count()` added in 7.4A | ✅ Non-breaking addition |
| Typed helpers (`saveConnection`, etc.) | ✅ Unchanged, route through `db.*` |

---

## 2. Entity Coverage Report

| Source | Count | Match |
|--------|-------|-------|
| `entity-registry.mjs` | 39 | — |
| `dbClient.js` `ENTITY_TABLE_MAP` | 39 | ✅ Identical keys + table names |
| `supabase/migrations/` entity tables | 39 | ✅ Identical table names |
| `makeSupabaseEntity` wired via `ALL_ENTITY_NAMES` | 39 | ✅ |

| Check | Result |
|-------|--------|
| Missing entities | **None** |
| Duplicate table mappings | **None** |
| Incorrect table names | **None** |
| Key/name drift vs Phase 7.3 audit | **None** |

---

## 3. Query Translation Report

### CRUD mapping (Supabase path)

| Operation | Implementation | Base44 calls in Supabase path |
|-----------|----------------|------------------------------|
| `list` | `from(table).select('*')` + sort/limit | **None** ✅ |
| `filter` | `from(table).select('*')` + `applyFilters()` | **None** ✅ |
| `get` | `.select('*').eq('id', id).maybeSingle()` | **None** ✅ |
| `create` | `.insert(record).select('*').single()` | **None** ✅ |
| `update` | `.update(payload).eq('id', id).select('*').single()` | **None** ✅ |
| `delete` | `.delete().eq('id', id)` | **None** ✅ |
| `count` | `.select('*', { count: 'exact', head: true })` | **None** ✅ |

### Filter operators

| Operator | Supported | Mechanism |
|----------|-----------|-----------|
| `eq` | ✅ | Default `{ field: value }` → `.eq()` |
| `neq` | ✅ | `field_neq` suffix or `{ $neq: v }` |
| `gt` | ✅ | Suffix or `$gt` object |
| `gte` | ✅ | Suffix or `$gte` object |
| `lt` | ✅ | Suffix or `$lt` object |
| `lte` | ✅ | Suffix or `$lte` object |
| `like` | ✅ | Suffix or `$like` object |
| `ilike` | ✅ | Suffix or `$ilike` object |
| `in` | ✅ | Array value or `field_in` suffix |
| `contains` | ✅ | String → `ilike %val%`; object/array → `.contains()` |
| `is` | ❌ | **Not implemented** — no `.is()` null checks |
| `or` | ❌ | **Not implemented** — no `.or()` compound filters |

**Production page impact:** All 60+ `filter()` call sites use simple equality only. Missing `is`/`or` is **latent gap**, not a current page breaker.

### Sorting

| Input | `parseSort()` output | Supabase |
|-------|---------------------|----------|
| `-created_date` | `{ column: 'created_date', ascending: false }` | `.order('created_date', { ascending: false })` |
| `+company_name` | `{ column: 'company_name', ascending: true }` | `.order('company_name', { ascending: true })` |
| `status` | `{ column: 'status', ascending: true }` | `.order('status', { ascending: true })` |

Column names align with migrations (`created_date`, not `created_at`). ✅

### Pagination

| Mode | API | Implementation |
|------|-----|----------------|
| `limit` | `list(sort, 200)` | `.limit(200)` |
| `offset` | `list(sort, 200, 100)` | `.range(100, 299)` |
| `page` | `list(sort, 200, { page: 2 })` | `offset = (page-1) × limit` |

Return type remains `Array<Row>` — compatible with all existing pages. ✅

### Count

```javascript
// supabaseEntity.js:123-128
from().select("*", { count: "exact", head: true })
```

Returns `number` (`count ?? 0`). Matches intended API. ✅

---

## 4. Realtime Audit

| Requirement | Status | Detail |
|-------------|--------|--------|
| `supabase.channel()` | ✅ | `db-realtime:{tableName}` |
| `postgres_changes` | ✅ | `event: '*'` on `schema: 'public'` |
| INSERT | ✅ | Covered by `*` |
| UPDATE | ✅ | Covered by `*` |
| DELETE | ✅ | Covered by `*` |
| Unsubscribe function | ✅ | Removes callback; ref-counted channel teardown via `removeChannel()` |
| All entities | ✅ | Implemented for all 39 tables |
| Page consumers | ✅ | `Connections.jsx`, `Meetings.jsx` only |

**Infrastructure dependency:** Supabase Dashboard replication must be enabled per table or realtime delivers no events (code is correct; infra is external).

---

## 5. Feature Flag Audit

| `VITE_DATA_BACKEND` | `makeEntity()` branch | Mixed runtime |
|---------------------|----------------------|---------------|
| `base44` (default) | `makeBase44Entity` → `base44.entities` | **No** |
| `supabase` | `makeSupabaseEntity` → `getSupabaseClient().from()` | **No** |
| Invalid value | Falls back to `base44` | **No** |

`makeEntity()` is evaluated once per entity at module init. Backend is fixed for the session. ✅

`getSupabaseClient()` throws if `supabase` backend without env vars — fail-fast, no silent Base44 fallback. ✅

---

## 6. Base44 Dependency Audit

### Supabase path (`supabaseEntity.js`, `supabaseQuery.js`)

| Check | Result |
|-------|--------|
| `base44` imports | **0** ✅ |
| `base44.entities` CRUD calls | **0** ✅ |
| Direct Base44 SDK usage | **None** ✅ |

### `dbClient.js` (module level)

| Line | Finding | Severity |
|------|---------|----------|
| `import { base44 } from "@/api/base44Client"` | **Unconditional import** — `@base44/sdk` remains in bundle when `VITE_DATA_BACKEND=supabase` | ⚠️ Minor |
| `base44.entities[entityName]` | Only executed inside `makeBase44Entity` when `isBase44()` | ✅ Runtime-isolated |

### Repository-wide `base44.entities` in `src/`

Only occurrence: `src/utils/dbClient.js:89` (Base44 branch). ✅

---

## 7. Page Compatibility

| Check | Result |
|-------|--------|
| Pages importing `db` from `@/utils/dbClient` | **58 pages** + hooks/components |
| Pages importing Supabase modules directly | **0** |
| Pages importing `base44.entities` | **0** |
| Pages modified for 7.4A | **0** |
| Required page changes for new dbClient | **None** |

---

## 8. Build & Static Analysis

| Check | Result |
|-------|--------|
| `npm run build` | ✅ Pass |
| ESLint on 7.4A files (`dbClient`, `supabaseEntity`, `supabaseQuery`) | ✅ No issues |
| ESLint repo-wide | ⚠️ 145 pre-existing unused-import errors (unrelated to 7.4A) |
| Import resolution | ✅ All `@/` aliases resolve |
| Circular dependencies | ✅ None (`dbClient` → `supabaseEntity` → `supabaseQuery`; no back-edge) |
| Duplicate helper implementations | ✅ `generateUUID`/`parseSort` canonical in `supabaseQuery.js`; re-exported from `dbClient.js` |

---

## 9. Risk Assessment

| Risk | Severity | Status | Notes |
|------|----------|--------|-------|
| No RLS on Supabase | High | Open (7.4.5) | Anon key has full table access until policies applied |
| `authClient` still Base44 | High | Open (7.4B) | Supabase dbClient without Supabase auth = broken user context |
| Empty database | Medium | Open (7.5) | Pages show empty states |
| Realtime replication not configured | Medium | Open (infra) | Subscriptions connect but may receive no events |
| `is` / `or` filter gaps | Low | Open | Zero current page usage |
| Eager `base44` import in dbClient | Low | Open | Bundle size / coupling; no runtime CRUD leak |
| No live Supabase CRUD smoke test | Medium | Open | Static audit only |
| `saveActivity` metadata as JSON string | Low | Open | Pre-existing; jsonb column accepts string |

---

## 10. Minor fixes recommended (non-blocking for 7.4B)

1. **Lazy-load `base44Client`** in `dbClient.js` (dynamic import inside `makeBase44Entity`) to avoid bundling Base44 when `supabase` backend is active.
2. **Add `is` operator** — map `null` values or `{ $is: null }` to `.is(column, null)`.
3. **Add `or` operator** — support compound filter objects if Base44 parity is required later.
4. **Live smoke test** on Vercel Preview with `VITE_DATA_BACKEND=supabase` after 7.5 seed.
5. **Enable Realtime replication** for `connection` and `meeting` in Supabase Dashboard.

---

## Success criteria vs audit

| Criterion | Result |
|-----------|--------|
| dbClient operates on Supabase when flag set | ✅ |
| All 39 entities supported | ✅ |
| Existing pages run unchanged | ✅ |
| Base44 available through feature flag | ✅ |
| No regressions on `base44` default path | ✅ (build passes; factory unchanged) |
| Production cutover ready | ❌ (auth, RLS, data, live test pending) |
| Phase 7.4B ready | ✅ with minor fixes noted above |
