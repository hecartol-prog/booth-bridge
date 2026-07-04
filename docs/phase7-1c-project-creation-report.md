# Phase 7.1C — Supabase Project Creation Report

**Generated:** 2026-07-02  
**Canonical roadmap:** [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md)  
**Prior decision:** Phase 7.1B recommended **CREATE NEW PROJECT** — old ref `jjqhmvfzqpohvukoxeoe` abandoned  
**Scope:** Provision project, link repository, document env config, validate migration readiness — **no migrations executed**

---

## Final recommendation

### **READY WITH MINOR ACTIONS**

The new Supabase project is **created, active, and empty**. Migration files are validated and ready for `supabase db push`. **One blocking minor action remains:** authenticate the Supabase CLI and complete `supabase link` so Phase 7.2 can run from this workstation or CI.

---

## 1. Project Creation Report

### New project

| Field | Value |
|-------|-------|
| **Project name** | BoothBridge |
| **Project ref** | `jjqhmvfzqpohvukoxeoe` |
| **Organization** | hecartol-prog's Org (`uyjqppgguiroqjcwxpcy`) |
| **Region** | `ap-northeast-1` (Tokyo) |
| **Plan** | Free ($0/mo — confirmed via MCP `get_cost`) |
| **Status** | **ACTIVE_HEALTHY** |
| **Postgres** | 17.6.1.141 (engine 17) |
| **Database host** | `db.jjqhmvfzqpohvukoxeoe.supabase.co` |
| **API URL** | `https://jjqhmvfzqpohvukoxeoe.supabase.co` |
| **Created** | 2026-07-02T07:56:27Z |

### Creation method

| Step | Result |
|------|--------|
| MCP `list_organizations` | **Pass** — `hecartol-prog's Org` found |
| MCP `get_cost` (Free tier) | **Pass** — $0/month |
| MCP `confirm_cost` | **Pass** |
| MCP `create_project` | **Pass** — ref `jjqhmvfzqpohvukoxeoe` |

### Abandoned project (intentional)

| Field | Old value | Action |
|-------|-----------|--------|
| Ref | `jjqhmvfzqpohvukoxeoe` | **Not recovered** — belongs to inaccessible org `flsmrphgbjxjxjlncwuk` |
| Local link artifact | Still references old ref in `supabase/.temp/linked-project.json` | **Replace** after CLI `supabase link` to new ref |

---

## 2. CLI Link Report

### CLI environment

| Check | Result |
|-------|--------|
| CLI version | **2.109.0** (`npx supabase`) |
| Global `supabase` binary | **Not installed** — use `npx supabase` |
| `SUPABASE_ACCESS_TOKEN` (env) | **Unset** |
| Token file (`~/.supabase/`) | **Not present** |
| `npx supabase login` | **Not completed** — requires interactive browser or pasted PAT |

### Command verification

| Command | Result | Notes |
|---------|--------|-------|
| `npx supabase projects list` | **Fail** | `LegacyPlatformAuthRequiredError` — no access token |
| `npx supabase link --project-ref jjqhmvfzqpohvukoxeoe --yes` | **Fail** | Same auth error |
| `npx supabase migration list --linked` | **Not run** | Blocked by missing CLI auth |
| `npx supabase migration list --local` | **Fail** | Local Docker Postgres not running |

### MCP verification (alternative path — project accessible)

| Check | Result |
|-------|--------|
| MCP `list_projects` | **Pass** — BoothBridge listed as ACTIVE_HEALTHY |
| MCP `get_project(jjqhmvfzqpohvukoxeoe)` | **Pass** |
| MCP `list_migrations` | **Pass** — `[]` (none applied) |
| MCP `list_tables` | **Pass** — `[]` (no public schema tables) |
| MCP `execute_sql` (connectivity) | **Pass** — `SELECT 1` equivalent via table count query |

### Required unblock (CLI)

Run in an **interactive** terminal (browser OAuth or token paste):

```bash
cd "c:\Users\hecto\Documents\Top\Boothbridge\App code\booth-bridge"
npx supabase login
```

Or with a [personal access token](https://supabase.com/dashboard/account/tokens):

```bash
npx supabase login --token <YOUR_ACCESS_TOKEN>
```

Then link and verify:

```bash
npx supabase link --project-ref jjqhmvfzqpohvukoxeoe
npx supabase projects list          # must include BoothBridge
npx supabase migration list --linked
```

**Note:** `supabase link` will prompt for the database password set at project creation. Retrieve or reset it from [Dashboard → Project Settings → Database](https://supabase.com/dashboard/project/jjqhmvfzqpohvukoxeoe/settings/database).

### Stale local link artifact

`supabase/.temp/linked-project.json` still points to the abandoned ref:

```json
{"ref":"jjqhmvfzqpohvukoxeoe","name":"Booth Bridge App","organization_id":"flsmrphgbjxjxjlncwuk"}
```

This will be overwritten when `supabase link` succeeds against `jjqhmvfzqpohvukoxeoe`.

---

## 3. Environment Configuration Report

**Secrets policy:** Values were retrieved via Supabase MCP during this phase. **They are not reproduced below.** Store them only in the locations listed.

### Values to configure

| Variable | Value source | Format / notes |
|----------|--------------|----------------|
| **Project ref** | Dashboard URL or MCP | `jjqhmvfzqpohvukoxeoe` |
| **SUPABASE_URL** | MCP `get_project_url` | `https://jjqhmvfzqpohvukoxeoe.supabase.co` |
| **SUPABASE_ANON_KEY** | Dashboard → Settings → API → `anon` / `public` key, or MCP `get_publishable_keys` | JWT (`eyJ…`) or publishable key (`sb_publishable_…`) |
| **SUPABASE_SERVICE_ROLE_KEY** | Dashboard → Settings → API → `service_role` secret | **Server-only** — not available via MCP publishable-keys endpoint |

### Vite application mapping (Phase 7.4+)

Per [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md):

| App variable | Maps from |
|--------------|-----------|
| `VITE_SUPABASE_URL` | `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` |
| `VITE_DATA_BACKEND` | `base44` until Phase 7.7 cutover; `supabase` on preview during 7.4–7.6 |

### Where to store each value

| Value | Local development | Vercel Preview | Vercel Production | Never store here |
|-------|-------------------|----------------|-------------------|------------------|
| Project ref | `.env.local` (comment or `SUPABASE_PROJECT_REF`) | — (not needed at runtime) | — | Git repo |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | `.env.local` | Vercel env (Preview) | Vercel env (Production) | — |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | `.env.local` | Vercel env (Preview) | Vercel env (Production) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Team vault; local `.env.local` only if running seed scripts | Team vault / CI secret (if needed) | Team vault / CI secret | `VITE_*` vars, client bundle, git |
| Database password | Team vault | — | — | Git repo |
| `SUPABASE_ACCESS_TOKEN` (CLI) | Developer machine / CI vault | CI secret (optional) | CI secret (optional) | Git repo |

### Retrieval checklist

1. [ ] Open [BoothBridge project dashboard](https://supabase.com/dashboard/project/jjqhmvfzqpohvukoxeoe)
2. [ ] Settings → API → copy `anon` key → store per table above
3. [ ] Settings → API → copy `service_role` key → team vault only
4. [ ] Settings → Database → note or reset database password for `supabase link`
5. [ ] Account → Access Tokens → create PAT for CLI/CI → `npx supabase login --token …`

---

## 4. Project Readiness Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Database reachable | **Pass** | MCP `execute_sql` succeeded |
| Project active | **Pass** | `ACTIVE_HEALTHY` via MCP `get_project` |
| Correct region | **Pass** | `ap-northeast-1` (Tokyo) per create request |
| CLI linked | **Fail** | Auth blocked — see §2 |
| No migrations applied | **Pass** | MCP `list_migrations` → `[]` |
| No application schema | **Pass** | `public` table count = **0** |
| Required extensions available | **Pass** | `pgcrypto` 1.3, `uuid-ossp` 1.1 pre-installed on platform |
| Postgres major version match | **Pass** | Remote 17.x matches `supabase/config.toml` `major_version = 17` |

### Old project status

`jjqhmvfzqpohvukoxeoe` was **not accessed** and is treated as abandoned per Phase 7.1B decision.

---

## 5. Migration Readiness Report

**Objective:** Confirm repository is ready for `supabase db push` **without executing it**.

### File inventory

| Category | Files | Count |
|----------|-------|-------|
| Extensions | `001_extensions.sql` | 1 |
| Triggers (function) | `002_updated_at_trigger.sql` | 1 |
| Entity tables | `010_user.sql` … `048_stress_test_result.sql` | 39 |
| Indexes | `090_indexes.sql` | 1 |
| Foreign keys / constraints | `091_constraints.sql` | 1 |
| **Total** | | **43** |

### Ordering validation

| Check | Result |
|-------|--------|
| Lexicographic sort order | **Valid** — `001` → `002` → `010`–`048` → `090` → `091` |
| `set_updated_date()` before table triggers | **Valid** — function in `002`; 39 entity files attach `BEFORE UPDATE` triggers |
| Indexes after tables | **Valid** — `090` follows all `CREATE TABLE` |
| FK constraints after tables | **Valid** — `091` references 39 entity tables |
| `CREATE TABLE` statements | **39** — matches roadmap |

### Extension dependencies

| Extension | In `001_extensions.sql` | On remote (pre-migration) |
|-----------|-------------------------|---------------------------|
| `pgcrypto` | `CREATE EXTENSION IF NOT EXISTS` | Installed 1.3 |
| `uuid-ossp` | Not in migration (uses `gen_random_uuid()` from pgcrypto) | Pre-installed 1.1 on Supabase |

`001_extensions.sql` is idempotent (`IF NOT EXISTS`). No extension gap for `db push`.

### Dependency chain (reproducibility)

```
001_extensions.sql
    └── 002_updated_at_trigger.sql (function only)
            └── 010_user.sql … 048_stress_test_result.sql (tables + per-table triggers)
                    └── 090_indexes.sql
                            └── 091_constraints.sql (~100 FK/unique constraints)
```

Empty remote database: FK constraints in `091` apply cleanly (no orphan rows).

### `db push` preflight (not executed)

| Method | Result |
|--------|--------|
| `npx supabase db push --linked --dry-run` | **Not run** — CLI not authenticated |
| MCP `apply_migration` | **Not used** — out of scope |
| Static analysis | **Pass** — 43 files, valid order, extensions available |

### Expected post-push state (Phase 7.2 target)

| Metric | Expected |
|--------|----------|
| `public` base tables | 39 |
| Remote migration history rows | 43 |
| Extensions | `pgcrypto` (+ platform `uuid-ossp`) |
| `updated_date` triggers | 39 tables |

---

## 6. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| CLI not authenticated blocks Phase 7.2 | Medium | **Current** | `npx supabase login` + `link` (§2) |
| Stale link to `jjqhmvfzqpohvukoxeoe` causes wrong-target push | High | Medium until relink | Verify `migration list --linked` shows new ref before `db push` |
| Service role key exposed in Vite env | Critical | Low if process followed | Store only in vault; never `VITE_*` |
| Free tier limits (pausing, connections) | Medium | Medium during dev | Monitor dashboard; upgrade to Pro before 7.7 |
| Tokyo region latency for non-Asia users | Low | Known | Accepted per Phase 7.1C requirement (Asia-first MVP) |
| `091_constraints.sql` fails on typo | Medium | Low | Run `db push` on linked project; fix-forward if needed |
| Database password lost | Medium | Medium | Reset via dashboard before `supabase link` |

---

## 7. Phase 7.2 Unblock Checklist

1. [ ] `npx supabase login` (interactive or `--token`)
2. [ ] `npx supabase link --project-ref jjqhmvfzqpohvukoxeoe`
3. [ ] `npx supabase projects list` includes BoothBridge
4. [ ] `npx supabase migration list --linked` — local 43 / remote 0
5. [ ] Optional: `npx supabase db push --linked --dry-run`
6. [ ] Execute Phase 7.2: `npx supabase db push --linked`
7. [ ] Store env vars per §3 (team vault + Vercel preview)

---

## 8. Constraints compliance

| Constraint | Honored |
|------------|---------|
| Do NOT execute migrations | **Yes** — `db push` not run |
| Do NOT seed data | **Yes** |
| Do NOT modify SQL | **Yes** |
| Do NOT modify application code | **Yes** |
| Do NOT begin Phase 7.4 | **Yes** |
| Do NOT touch Base44 runtime | **Yes** |
| Do NOT recover old project | **Yes** — new project under accessible org |
| Do NOT expose secrets in logs/reports | **Yes** — values redacted; storage locations documented |

---

## Related documents

| Document | Role |
|----------|------|
| [`phase7-1b-project-ownership-report.md`](./phase7-1b-project-ownership-report.md) | CREATE NEW decision |
| [`phase7-2a-authentication-report.md`](./phase7-2a-authentication-report.md) | Prior CLI auth gap (superseded by new ref) |
| [`phase7-complete-supabase-transition.md`](./phase7-complete-supabase-transition.md) | Phase 7.2+ roadmap |
| [`supabase/migrations/`](../supabase/migrations/) | Schema to apply in 7.2 |

---

*Phase 7.1C complete. Proceed to Phase 7.2 after CLI login + link.*
