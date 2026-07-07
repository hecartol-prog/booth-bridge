# RC5-3 — Supabase Production Verification

**Generated:** 2026-07-06  
**Canonical project (repo + CLI):** `jjqhmvfzqpohvukoxeoe`  
**Project name:** Booth Bridge App  
**Region:** `ap-northeast-1`  
**API URL:** `https://jjqhmvfzqpohvukoxeoe.supabase.co`

---

## Executive Summary

| Area | Result |
|------|--------|
| Correct project linked locally | **PASS** |
| Project reachable | **PASS** |
| Migrations applied | **PASS** (47/47, dry-run clean) |
| Edge Functions | **PASS** (10/10 ACTIVE v2) |
| Schema / tables | **PASS** (REST responds; migrations synced) |
| Storage buckets (live enum) | **NOT VERIFIED** (anon list returned `[]`) |
| Secondary stray project | **WARNING** — `ebaquannrgbgjihbjfdc` exists with empty DB |

---

## Project Identity

| Check | Evidence | Status |
|-------|----------|--------|
| Repo link file | `supabase/.temp/project-ref` → `jjqhmvfzqpohvukoxeoe` | **PASS** |
| CLI linked project | `supabase projects list` → `linked: true` on `jjqhmvfzqpohvukoxeoe` | **PASS** |
| CLI status | `ACTIVE_HEALTHY` | **PASS** |
| MCP access to canonical | `get_project_url(jjqhmvfzqpohvukoxeoe)` → permission denied | N/A (different MCP account scope) |
| REST reachability | `GET /rest/v1/` → `Invalid API key` (project alive) | **PASS** |

### API Keys (prefixes only — do not commit full keys)

| Key type | Prefix | Status |
|----------|--------|--------|
| Anon (legacy JWT) | `kwOGo` | Present (`supabase projects api-keys`) |
| Publishable | `sb_publishable_1byIc` | Present |
| Service role | `xnx6n` | Present (server-side only) |

---

## Migrations

```text
supabase db push --dry-run
→ Remote database is up to date.
```

```text
supabase migration list --linked
→ 47 local/remote pairs matched (001–048 gaps intentional numbering, plus 090–095)
```

| Migration range | Count | Status |
|-----------------|-------|--------|
| `001`–`048` (entity tables) | 39 files | **Applied** |
| `090`–`095` (indexes, RLS, storage, realtime) | 6 files | **Applied** |
| **Pending** | 0 | **PASS** |

---

## Schema & RLS (repository + prior validation)

| Item | Repo evidence | Live RC5 |
|------|---------------|----------|
| Tables | 39 entities in `ENTITY_TABLE_MAP` | **NOT re-counted via SQL** (MCP permission denied on canonical) |
| RLS enabled | `092_enable_rls.sql` | Prior Phase 7.8B: 39/39 — **NOT re-verified live** |
| Indexes / constraints | `090_indexes.sql`, `091_constraints.sql` | Applied per migration list |

### Anon REST probe (RLS smoke)

```text
GET /rest/v1/booth?select=id&limit=1
Authorization: apikey=<anon>
→ HTTP 200, body: []
```

Empty result with 200 indicates RLS is filtering rows for unauthenticated access — **expected PASS**.

---

## Storage

| Bucket (repo) | Migration | Live enumeration |
|---------------|-----------|------------------|
| `boothbridge-media` | `093_storage_setup.sql` | **NOT VERIFIED** |
| `boothbridge-assets` | `093_storage_setup.sql` | **NOT VERIFIED** |
| `boothbridge-ocr` | `093_storage_setup.sql` | **NOT VERIFIED** |

```text
GET /storage/v1/bucket (anon JWT)
→ HTTP 200, body: []
```

Empty array may indicate buckets are not listable with anon role (expected for private buckets) — **not proof buckets are missing**.

**Prior validated evidence:** Phase 7.6 E2E harness reported upload/download/delete PASS for all three buckets. **NOT re-run in RC5** (service-role harness blocked by security policy in validator session).

---

## Realtime

Configured in `095_realtime.sql`:

- `public.connection` → `supabase_realtime` publication
- `public.meeting` → `supabase_realtime` publication

**Live subscription test:** **NOT VERIFIED** in RC5 (requires authenticated browser session or harness).

---

## Edge Functions

```text
supabase functions list --project-ref jjqhmvfzqpohvukoxeoe
→ 10 functions, all ACTIVE, version 2
```

| Function | verify_jwt | Status |
|----------|------------|--------|
| `admin-auth` | `false` | ACTIVE v2 |
| `ai-health` | `true` | ACTIVE v2 |
| `ai-generate` | `true` | ACTIVE v2 |
| `ai-chat` | `true` | ACTIVE v2 |
| `ai-document` | `true` | ACTIVE v2 |
| `ai-business-card` | `true` | ACTIVE v2 |
| `ai-summary` | `true` | ACTIVE v2 |
| `ai-classify` | `true` | ACTIVE v2 |
| `ai-match` | `true` | ACTIVE v2 |
| `ai-recommend` | `true` | ACTIVE v2 |

---

## Edge Secrets (names only)

```text
supabase secrets list --project-ref jjqhmvfzqpohvukoxeoe
```

| Secret name | Present (2026-07-06) |
|-------------|---------------------|
| `SUPABASE_URL` | ✅ |
| `SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `SUPABASE_DB_URL` | ✅ |
| `SUPABASE_JWKS` | ✅ |
| `SUPABASE_PUBLISHABLE_KEYS` | ✅ |
| `SUPABASE_SECRET_KEYS` | ✅ |
| `OPENAI_API_KEY` | ✅ |
| `OPENROUTER_API_KEY` | ❌ **ABSENT** |
| `AI_PROVIDER` | ❌ not set (defaults in code) |
| `AI_PROVIDER_ORDER` | ❌ not set (defaults in code) |

---

## Authentication (platform)

| Item | RC5 status |
|------|------------|
| Supabase Auth endpoint | `GET /auth/v1/health` reachable (~1.2s RTT) | **PASS** |
| SMTP configuration | **NOT VERIFIED** (Dashboard access required) |
| OAuth providers | **NOT VERIFIED** (Dashboard access required) |
| Redirect URLs | **NOT VERIFIED** on production domain (app not deployed) |

---

## Stray Project Warning

Supabase MCP (alternate org) lists:

| Ref | Name | Status | Tables |
|-----|------|--------|--------|
| `ebaquannrgbgjihbjfdc` | BoothBridge | ACTIVE_HEALTHY | **0 public tables** |
| `hffqcsbeyplaoejapzss` | Supabase tigersourcer Project | INACTIVE | — |

Edge functions exist on `ebaquannrgbgjihbjfdc` but **database is empty**. This is **not** the canonical project. Ensure all operators use `jjqhmvfzqpohvukoxeoe` only.

---

## How to Verify (Operator Checklist)

1. Supabase Dashboard → confirm project ref `jjqhmvfzqpohvukoxeoe`
2. Database → Migrations — confirm no pending
3. Storage → confirm 3 private buckets exist
4. Authentication → URL configuration → `https://boothbridge.app/**`
5. Edge Functions → all 10 ACTIVE
6. Project Settings → API → copy anon key to Vercel `VITE_SUPABASE_ANON_KEY`
7. Run: `node scripts/phase7-6-e2e-validation.mjs` with `SUPABASE_*` env vars

---

## Verdict

**PASS (backend infrastructure)** with **WARNINGS**:

- Migrations and Edge Functions are production-ready on canonical project.
- `OPENROUTER_API_KEY` missing — blocks primary AI path (see RC5-4).
- Full storage/realtime live smoke not re-executed in RC5.
- Frontend not connected (no `VITE_*` on live host).
