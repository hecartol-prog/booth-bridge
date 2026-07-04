# Phase 7.1B — Project Ownership Verification

**Generated:** 2026-07-02  
**Linked project (repository):** `jjqhmvfzqpohvukoxeoe` (Booth Bridge App)  
**Task:** Ownership verification only — no migrations, code, or schema changes

---

## Project Recommendation

### **CREATE NEW PROJECT**

---

## 1. Project Ownership Report

### Target project: `jjqhmvfzqpohvukoxeoe`

| Question | Finding | Evidence |
|----------|---------|----------|
| **Does the project still exist?** | **Likely yes** | `https://jjqhmvfzqpohvukoxeoe.supabase.co/rest/v1/` returns **401 Unauthorized** (live API endpoint). A non-existent ref does not respond the same way (comparison fetch timed out). Migrations were never applied — database is presumed empty. |
| **Which organization owns it?** | **`flsmrphgbjxjxjlncwuk`** | `supabase/.temp/linked-project.json` from a prior successful `supabase link` |
| **Project display name** | Booth Bridge App | Same link artifact |
| **Region** | `ap-northeast-1` (Tokyo) | `supabase/.temp/pooler-url` → `aws-1-ap-northeast-1.pooler.supabase.com` |
| **Postgres version (at link time)** | 17.6.1.127 | `supabase/.temp/postgres-version` |
| **Migrations applied?** | **No** (blocked in Phase 7.2) | No migration history verified; schema not in production use |

### Ownership vs current credentials

| Credential source | Can access `jjqhmvfzqpohvukoxeoe`? |
|-------------------|-----------------------------------|
| Supabase CLI (this machine) | **No** — not authenticated |
| Supabase MCP (Cursor plugin) | **No** — `get_project` → permission denied |
| Supabase MCP `list_projects` | **No** — project not listed |

**Conclusion:** The project is **not owned by, and not visible to**, the currently authenticated Supabase account on this workstation.

### Who must own it (inferred)

The project was linked by **some Supabase account** that had membership in organization `flsmrphgbjxjxjlncwuk`. That account is **not** the one currently available here.

| Known | Unknown |
|-------|---------|
| Organization ID: `flsmrphgbjxjxjlncwuk` | Organization display name |
| Organization slug: `flsmrphgbjxjxjlncwuk` (same as ID) | Owner email / GitHub / Google login |
| Project was named "Booth Bridge App" at link time | Whether org still exists or account is recoverable |

**To keep the current project**, someone must sign in with the Supabase account that created or was invited to organization `flsmrphgbjxjxjlncwuk`, then run:

```bash
npx supabase login
npx supabase projects list   # must show jjqhmvfzqpohvukoxeoe
```

Check candidate accounts: any other email used for Supabase, a teammate’s account, or a company SSO login used during initial Booth Bridge setup. The dashboard URL to try after login:

`https://supabase.com/dashboard/project/jjqhmvfzqpohvukoxeoe`

If **no team member** can access that organization, the project is effectively **orphaned** from the team’s perspective.

---

## 2. Organization Report

### Organization A — linked project owner (inaccessible)

| Field | Value |
|-------|-------|
| **Organization ID** | `flsmrphgbjxjxjlncwuk` |
| **Slug** | `flsmrphgbjxjxjlncwuk` |
| **Projects known** | `jjqhmvfzqpohvukoxeoe` (Booth Bridge App) |
| **Current account membership** | **No** — `get_organization(flsmrphgbjxjxjlncwuk)` → permission denied |
| **Plan / billing** | Unknown (no API access) |

### Organization B — currently authenticated (accessible)

| Field | Value |
|-------|-------|
| **Organization ID** | `uyjqppgguiroqjcwxpcy` |
| **Name** | **hecartol-prog's Org** |
| **Plan** | **Free** |
| **Projects visible** | 1 — `jjqhmvfzqpohvukoxeoe` ("Booth Bridge App") |
| **Current account owns this org?** | **Yes** — full MCP API access |

### Accessible project (not Booth Bridge)

| Field | Value |
|-------|-------|
| Ref | `jjqhmvfzqpohvukoxeoe` |
| Name | Supabase tigersourcer Project |
| Region | `us-west-2` |
| Status | **INACTIVE** (paused) |
| Relevance to Booth Bridge | **None** — different product; unsuitable to repurpose without explicit decision |

### Does the current account own organization `flsmrphgbjxjxjlncwuk`?

**No.** The authenticated account (`hecartol-prog's Org`) is a **different organization** with no visibility into `flsmrphgbjxjxjlncwuk` or project `jjqhmvfzqpohvukoxeoe`.

---

## 3. Project Recommendation — evaluation

### Option A: Keep `jjqhmvfzqpohvukoxeoe` (Booth Bridge App)

| Factor | Assessment |
|--------|------------|
| Clean schema-only migration | Neutral — migrations not yet applied; either project works |
| No production data | **No data loss** if abandoned; **no benefit** to keeping without access |
| Empty database | True for both options |
| Future production deployment | **Blocked** until correct account credentials recovered |
| Minimal technical debt | **High debt** — inaccessible project, unknown owner, wrong region for US trade-show audience (`ap-northeast-1`), team cannot run `db push` |
| Local link artifacts | Stale link to project team cannot manage |

**Keep only if:** a team member can log into organization `flsmrphgbjxjxjlncwuk` within 24–48 hours.

### Option B: Create new project under `hecartol-prog's Org`

| Factor | Assessment |
|--------|------------|
| Clean schema-only migration | **Ideal** — fresh project, apply 43 migrations once |
| No production data | **Zero migration risk** |
| Empty database | Starts clean by design (Phase 7.5 seed later) |
| Future production deployment | **Controllable** — pick region, plan, naming now |
| Minimal technical debt | **Lowest** — CLI/MCP/dashboard all under one account |
| Ownership | Immediate — current authenticated account |

**Downside:** Abandon `jjqhmvfzqpohvukoxeoe` (orphan cloud resource; no data lost). Update local link + env vars (not done in this phase).

### Decision

| Criterion | Winner |
|-----------|--------|
| Team can proceed today | **Create new** |
| Schema-only / no data | **Tie** (both fine) |
| Production readiness | **Create new** (region + ownership) |
| Access recovery uncertain | **Create new** |

---

## 4. New project specification (if CREATE NEW PROJECT)

| Setting | Recommendation | Rationale |
|---------|----------------|-----------|
| **Project name** | `boothbridge` | Short, matches product; dashboard allows display name "Booth Bridge" |
| **Organization** | **hecartol-prog's Org** (`uyjqppgguiroqjcwxpcy`) | Only org the current account controls |
| **Region** | **`us-east-1`** | US trade-show audience; low latency to Vercel US edge; avoids Tokyo (`ap-northeast-1`) lock-in |
| **Pricing tier** | **Free** for Phase 7.2–7.6 development; upgrade to **Pro ($25/mo)** before Phase 7.7 production cutover | Org is currently Free; new project creation cost confirmed **$0/mo** on Free tier via MCP `get_cost` |
| **Postgres** | 17.x (default on create) | Matches `supabase/config.toml` `major_version = 17` |

### CLI commands to create and relink (execute manually — not run in 7.1B)

```bash
# 1. Authenticate CLI (if not already)
npx supabase login

# 2. Create project (interactive — confirm org and region)
npx supabase projects create boothbridge \
  --org-id uyjqppgguiroqjcwxpcy \
  --region us-east-1 \
  --db-password <STRONG_DB_PASSWORD>

# Or create via Supabase Dashboard → New project → hecartol-prog's Org → us-east-1

# 3. Note the new project ref from output or dashboard URL

# 4. Relink repository (from repo root)
cd "c:\Users\hecto\Documents\Top\Boothbridge\App code\booth-bridge"
npx supabase link --project-ref <NEW_PROJECT_REF>

# 5. Verify
npx supabase projects list
npx supabase migration list --linked

# 6. Proceed to Phase 7.2
npx supabase db push --linked
```

### Post-relink updates (Phase 7.1 / 7.2 — not executed here)

| Item | Action |
|------|--------|
| Team vault | Store new project ref, anon key, service role key |
| Vercel env | `VITE_SUPABASE_URL=https://<NEW_REF>.supabase.co` |
| Docs | Replace `jjqhmvfzqpohvukoxeoe` references in phase reports |
| Old project | Optional: delete `jjqhmvfzqpohvukoxeoe` from other account if recovered, to avoid confusion |

---

## 5. Alternative path — KEEP CURRENT PROJECT

Choose **KEEP CURRENT PROJECT** only if all of the following are true:

1. A team member identifies the Supabase login for organization `flsmrphgbjxjxjlncwuk`.
2. `npx supabase projects list` shows `jjqhmvfzqpohvukoxeoe` after that login.
3. `ap-northeast-1` region is acceptable for production (or team accepts region lock-in).

Then:

```bash
npx supabase login    # with the owning account
npx supabase link --project-ref jjqhmvfzqpohvukoxeoe
npx supabase migration list --linked
```

No new project required.

---

## 6. Investigation limitations

| Limitation | Impact |
|------------|--------|
| Cannot query `flsmrphgbjxjxjlncwuk` org metadata | Owner email unknown |
| CLI not authenticated | Cannot independently confirm project list for org A |
| MCP cannot call `get_project` on target ref | Dashboard-level status (ACTIVE/PAUSED) unconfirmed for `jjqhmvfzqpohvukoxeoe` |
| No destructive probes run | Existence inferred from API 401, not dashboard |

---

## Summary table

| Item | `jjqhmvfzqpohvukoxeoe` | `hecartol-prog's Org` (current) |
|------|------------------------|----------------------------------|
| Exists (likely) | Yes | N/A |
| Accessible to team | **No** | **Yes** |
| Migrations applied | No | N/A (new project needed) |
| Region | ap-northeast-1 | us-east-1 recommended |
| Recommended action | Abandon unless account recovered | **Create `boothbridge` here** |

---

*Verification only. No migrations, repository code, schema, or runtime were modified.*
