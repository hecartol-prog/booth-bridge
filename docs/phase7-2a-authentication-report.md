# Phase 7.2A — Authentication & Project Link Reports

**Generated:** 2026-07-02  
**Task:** Establish CLI authentication and verify readiness (no migrations)  
**Target linked project:** `jjqhmvfzqpohvukoxeoe`

---

## Final recommendation

### **NOT READY**

The Supabase CLI is **not authenticated** on this machine. The locally linked project (`jjqhmvfzqpohvukoxeoe`) belongs to a **different organization** than the account authenticated via the Supabase MCP plugin, and that project is **not accessible** to the current credentials.

---

## Authentication Report

| Check | Result |
|-------|--------|
| CLI version | **2.109.0** (`npx supabase@2.109.0`) |
| `npx supabase login` | **Not completed** — no access token stored |
| `SUPABASE_ACCESS_TOKEN` (env) | **Unset** |
| Token file (`~/.supabase/`) | **Not present** — only telemetry/traces |
| `npx supabase projects list` | **Fail** — `LegacyPlatformAuthRequiredError` |
| Supabase MCP plugin | **Authenticated** (separate credential path) |

### MCP-authenticated identity

| Field | Value |
|-------|-------|
| Organization | **hecartol-prog's Org** |
| Organization ID | `uyjqppgguiroqjcwxpcy` |
| Accessible projects | **1** (`hffqcsbeyplaoejapzss` — "Supabase tigersourcer Project") |

### Required action (CLI)

Run in an interactive terminal (browser or token paste):

```bash
npx supabase login
```

Or, with a personal access token from [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens):

```bash
npx supabase login --token <YOUR_ACCESS_TOKEN>
```

**Important:** Log in with the Supabase account that owns organization `flsmrphgbjxjxjlncwuk` and project `jjqhmvfzqpohvukoxeoe`. The MCP-authenticated account (`hecartol-prog's Org`) does **not** have access to that project.

### Verify after login

```bash
npx supabase projects list
# Must include jjqhmvfzqpohvukoxeoe
```

---

## Linked Project Report

| Check | Result |
|-------|--------|
| Local link artifact | **Present** — `supabase/.temp/linked-project.json` |
| Linked project ref | **`jjqhmvfzqpohvukoxeoe`** ✓ |
| Linked project name | Booth Bridge App |
| Linked organization ID | `flsmrphgbjxjxjlncwuk` |
| Pooler region (artifact) | `ap-northeast-1` |
| `npx supabase migration list --linked` | **Fail** — CLI not authenticated |
| CLI link verification | **Blocked** — cannot confirm live link until login |

### Account mismatch

| Source | Organization | Projects visible |
|--------|--------------|------------------|
| Local link (`supabase/.temp/`) | `flsmrphgbjxjxjlncwuk` | `jjqhmvfzqpohvukoxeoe` |
| MCP / available credentials | `uyjqppgguiroqjcwxpcy` | `hffqcsbeyplaoejapzss` only |

`get_project(jjqhmvfzqpohvukoxeoe)` via MCP returned **permission denied**. The linked project is not reachable with currently available credentials.

### Re-link (only if login succeeds but link is stale)

```bash
npx supabase link --project-ref jjqhmvfzqpohvukoxeoe
```

Do **not** re-link to a different project without an explicit decision — Phase 7.1/7.2 target is `jjqhmvfzqpohvukoxeoe`.

---

## Permission Report

Permissions assessed via CLI (blocked) and Supabase MCP (partial).

| Capability | CLI | MCP (current account) |
|------------|-----|------------------------|
| List projects | **Blocked** — no token | **Pass** — 1 project listed |
| Access `jjqhmvfzqpohvukoxeoe` | **Blocked** | **Fail** — permission denied |
| Access `hffqcsbeyplaoejapzss` | **Blocked** | **Partial** — metadata OK; DB **INACTIVE** (connection timeout) |
| List migrations | **Blocked** | **Fail** — timeout on inactive project |
| Apply migrations (`db push`) | **Blocked** | Not attempted (out of scope) |
| Reset database | **Blocked** | Not verified |
| Inspect schema (`list_tables`, SQL) | **Blocked** | **Fail** — connection timeout |

### MCP project status (accessible account)

| Field | Value |
|-------|-------|
| Ref | `hffqcsbeyplaoejapzss` |
| Name | Supabase tigersourcer Project |
| Region | `us-west-2` |
| Status | **INACTIVE** |
| Postgres | 17.6.1.127 |

An inactive project cannot be used for migration validation until restored in the Supabase dashboard.

### Expected permissions after correct CLI login

Once authenticated with the owner of `jjqhmvfzqpohvukoxeoe`, the following should succeed:

```bash
npx supabase projects list
npx supabase migration list --linked
npx supabase db push --linked --dry-run   # optional preflight
```

---

## CLI status summary

| Item | Value |
|------|-------|
| Version | `2.109.0` |
| Login status | **Not authenticated** |
| Project link (local) | `jjqhmvfzqpohvukoxeoe` (artifact only) |
| Project link (verified) | **No** |
| Ready for Phase 7.2 `db push` | **No** |

---

## Unblock checklist

1. [ ] `npx supabase login` with account that owns `jjqhmvfzqpohvukoxeoe` / org `flsmrphgbjxjxjlncwuk`
2. [ ] `npx supabase projects list` includes Booth Bridge App
3. [ ] `npx supabase link --project-ref jjqhmvfzqpohvukoxeoe` (if needed)
4. [ ] `npx supabase migration list --linked` runs without error
5. [ ] Re-run Phase 7.2 migration execution

---

*No migrations, SQL, application code, or Supabase project settings were modified during Phase 7.2A.*
