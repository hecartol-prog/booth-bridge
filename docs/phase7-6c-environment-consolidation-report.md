# BoothBridge Phase 7.6C Environment Consolidation Report

**Generated:** 2026-07-04  
**Repository:** `booth-bridge`  
**Scope:** environment audit only; no application code changes, no runtime switch, no deploys

## Executive Summary

Two Supabase projects are BoothBridge candidates in current repository history:

- `jjqhmvfzqpohvukoxeoe` - active, locally linked, schema-ready, and the only environment with the BoothBridge database, RLS, storage, realtime, and current canonical validation history
- `ebaquannrgbgjihbjfdc` - active, but effectively a parallel function-only environment with no BoothBridge schema applied

A third project, `hffqcsbeyplaoejapzss`, appears only in older access-diagnostic documentation and is unrelated to BoothBridge.

**Recommendation:** adopt `jjqhmvfzqpohvukoxeoe` as the single permanent BoothBridge backend and retire `ebaquannrgbgjihbjfdc` from all repository, operator, and documentation references after consolidation cleanup.

## 1. Audit Method

This report combines:

- repository-wide search for Supabase refs, URLs, env-var names, deployment artifacts, and documentation references
- direct Supabase CLI inspection of the locally linked project
- direct Supabase MCP inspection of the MCP-visible projects
- comparison against the latest in-repo phase reports when a field could not be queried live in the current tool context

No application files, runtime settings, database schema, secrets, or deployments were changed during this audit.

## 2. Repository Reference Inventory

### Actual config files present

| Category | Result |
| --- | --- |
| `.env*` | No tracked `.env*` files found |
| Vercel config | No tracked `vercel.json` or `vercel*.{json,js,ts}` files found |
| MCP config | No tracked `.mcp.json` found |
| Supabase CLI config | `supabase/config.toml` exists with local `project_id = "booth-bridge"` |
| Local Supabase link artifacts | `supabase/.temp/linked-project.json`, `supabase/.temp/project-ref`, and related temp files exist and point to `jjqhmvfzqpohvukoxeoe` |

### Key and secret references in repository

No literal anon keys, publishable keys, service-role keys, or database passwords are committed in tracked source. The repository only contains variable names, placeholders, or documentation examples such as:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Primary files containing those references:

- `src/api/supabaseClient.js`
- `src/config/backend.js`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/admin-auth/index.ts`
- `supabase/functions/README.md`
- `scripts/phase7-6-e2e-validation.mjs`
- `docs/phase7-1c-project-creation-report.md`
- `docs/phase7-4e-edge-function-report.md`
- `docs/phase7-4f-deployment-report.md`
- `docs/phase7-infrastructure-readiness-report.md`
- `docs/phase7-6-end-to-end-validation-report.md`

### Project A references: `jjqhmvfzqpohvukoxeoe`

Files currently pointing to or describing `jjqhmvfzqpohvukoxeoe`:

- `supabase/.temp/linked-project.json`
- `supabase/.temp/project-ref`
- `scripts/phase7-6-e2e-validation.mjs`
- `docs/checkpoints/phase7-complete-checkpoint.md`
- `docs/phase7-1b-project-ownership-report.md`
- `docs/phase7-2a-authentication-report.md`
- `docs/phase7-5b-security-report.md`
- `docs/phase7-5b-starting-point.md`
- `docs/phase7-5c-live-validation-report.md`
- `docs/phase7-5d-edge-function-deployment-report.md`
- `docs/phase7-6-end-to-end-validation-report.md`
- `docs/phase7-complete-supabase-transition.md`
- `docs/phase7-infrastructure-readiness-report.md`
- `docs/phase7-migration-execution-report.md`
- `docs/phase7-remaining-migration-roadmap.md`

### Project B references: `ebaquannrgbgjihbjfdc`

Files currently pointing to or describing `ebaquannrgbgjihbjfdc`:

- `scripts/phase7-4f/deploy-all-functions.mjs`
- `scripts/phase7-4f/.deploy-summary.json`
- `docs/phase7-1c-project-creation-report.md`
- `docs/phase7-4f-deployment-report.md`
- `docs/phase7-5b-starting-point.md`
- `docs/phase7-5c-live-validation-report.md`
- `docs/phase7-6b-stabilization-report.md`

In addition, `scripts/phase7-4f/` contains many generated deploy payloads and summaries whose contents are tied to `ebaquannrgbgjihbjfdc`.

### Project C references: `hffqcsbeyplaoejapzss`

Files referencing `hffqcsbeyplaoejapzss`:

- `docs/phase7-1b-project-ownership-report.md`
- `docs/phase7-2a-authentication-report.md`

This project does not appear in application wiring, deploy helpers, or current validation scripts.

### Important repository-side contradictions

| Area | `jjqhmvfzqpohvukoxeoe` | `ebaquannrgbgjihbjfdc` |
| --- | --- | --- |
| Local CLI link | Yes | No |
| Current Phase 7.6 harness default | Yes | No |
| Historical 7.1C "new project" decision | No | Yes |
| Historical 7.4F deployment target | No | Yes |
| Latest 7.5B/7.5C/7.5D/7.6 validation trail | Yes | No |

## 3. Live Environment Matrix

### Project A - `jjqhmvfzqpohvukoxeoe`

| Field | Value |
| --- | --- |
| Project name | `Booth Bridge App` |
| Project URL | `https://jjqhmvfzqpohvukoxeoe.supabase.co` |
| Region | `ap-northeast-1` |
| Current status | `ACTIVE_HEALTHY` |
| Access path in this audit | Supabase CLI (`supabase projects list`, `db query --linked`, `functions list`, `secrets list`, `projects api-keys`) |
| Migrations applied | `47` (`001`, `002`, `010`-`048`, `090`-`095`) |
| Edge Functions | `10 ACTIVE`: `admin-auth`, `ai-health`, `ai-generate`, `ai-chat`, `ai-document`, `ai-business-card`, `ai-summary`, `ai-classify`, `ai-match`, `ai-recommend` |
| API key inventory | Legacy `anon`, legacy `service_role`, one modern publishable key, one modern secret key (values redacted) |
| Secrets | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` |
| Public tables | `39` |
| RLS enabled tables | `39 / 39` |
| Public-table policies | `94` |
| Storage buckets | `3`: `boothbridge-assets`, `boothbridge-media`, `boothbridge-ocr` |
| Storage bucket posture | all 3 private |
| Storage policies | `16` |
| Auth users | `0` |
| Realtime | publication members: `public.connection`, `public.meeting` |
| Current repo role | locally linked project and target of current 7.5D/7.6 validation chain |

### Project B - `ebaquannrgbgjihbjfdc`

| Field | Value |
| --- | --- |
| Project name | `BoothBridge` |
| Project URL | `https://ebaquannrgbgjihbjfdc.supabase.co` |
| Region | `ap-northeast-1` |
| Current status | `ACTIVE_HEALTHY` |
| Access path in this audit | Supabase MCP (`list_projects`, `get_project`, `get_project_url`, `get_publishable_keys`, `list_migrations`, `list_edge_functions`, `execute_sql`) |
| Migrations applied | `0` (`list_migrations` returned `[]`; `supabase_migrations.schema_migrations` is absent) |
| Edge Functions | `10 ACTIVE`: `admin-auth`, `ai-health`, `ai-generate`, `ai-chat`, `ai-document`, `ai-business-card`, `ai-summary`, `ai-classify`, `ai-match`, `ai-recommend` |
| API key inventory | Legacy `anon` key plus one modern publishable key observed (values redacted) |
| Secrets | Not directly enumerable with current MCP toolset; historical repo evidence says `OPENAI_API_KEY` was absent or unavailable at runtime, `AI_PROVIDER`/`AI_MODEL` were unset, and hosted runtime was expected to provide `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` |
| Public tables | `0` |
| RLS enabled tables | `0 / 0` |
| Public-table policies | `0` |
| Storage buckets | `0` |
| Storage policies | `0` |
| Auth users | `0` |
| Realtime | no `public` publication members observed |
| Current repo role | wrong-target deployment lineage for Phase 7.4F artifacts and related documentation |

### Project C - `hffqcsbeyplaoejapzss`

| Field | Value |
| --- | --- |
| Project name | `Supabase tigersourcer Project` |
| Project URL | `https://hffqcsbeyplaoejapzss.supabase.co` |
| Region | `us-west-2` |
| Current status | `INACTIVE` |
| Access path in this audit | Supabase MCP metadata only |
| Migrations applied | not determined; DB access timed out |
| Edge Functions | `0` |
| API key inventory | not determined; key lookup failed in current session |
| Secrets | not determined |
| Public tables | not determined; DB access timed out |
| RLS | not determined |
| Storage buckets | not determined |
| Storage policies | not determined |
| Auth users | not determined |
| Realtime | not determined |
| Current repo role | unrelated project mentioned only in older access-diagnostic documents |

## 4. Drift Analysis

### Environment access drift

- The Supabase CLI and local link artifacts point to `jjqhmvfzqpohvukoxeoe`.
- The Supabase MCP account in this repository can see `ebaquannrgbgjihbjfdc` and `hffqcsbeyplaoejapzss`, but not `jjqhmvfzqpohvukoxeoe`.
- This split auth context is the root cause of operators being able to inspect or deploy against different projects from the same workstation.

### Schema and migration drift

| Area | `jjqhmvfzqpohvukoxeoe` | `ebaquannrgbgjihbjfdc` |
| --- | --- | --- |
| Migration history | `47` applied | `0` applied |
| Public tables | `39` | `0` |
| RLS-enabled tables | `39` | `0` |
| Public policies | `94` | `0` |

`ebaquannrgbgjihbjfdc` is not a partial copy of `jjqhmvfzqpohvukoxeoe`; it is effectively a separate empty database with function deployments.

### Edge Function drift

Both BoothBridge candidates currently have the same **10 function slugs** deployed, but they do not represent the same environment:

- `jjqhmvfzqpohvukoxeoe` has the BoothBridge schema, storage, RLS, and realtime platform underneath those functions
- `ebaquannrgbgjihbjfdc` has function endpoints without the BoothBridge database platform state
- `admin-auth` is version `1` on `jjqhmvfzqpohvukoxeoe` and version `2` on `ebaquannrgbgjihbjfdc`, which is concrete function-version drift

### Storage drift

| Area | `jjqhmvfzqpohvukoxeoe` | `ebaquannrgbgjihbjfdc` |
| --- | --- | --- |
| Buckets | `boothbridge-assets`, `boothbridge-media`, `boothbridge-ocr` | none |
| Storage policies | `16` | `0` |

### Auth and realtime drift

| Area | `jjqhmvfzqpohvukoxeoe` | `ebaquannrgbgjihbjfdc` |
| --- | --- | --- |
| Auth users | `0` | `0` |
| Realtime publication members | `public.connection`, `public.meeting` | none |

The two projects currently have the same live auth-user count, but only `jjqhmvfzqpohvukoxeoe` has the schema and policies required for real BoothBridge application behavior.

### Secret drift

- `jjqhmvfzqpohvukoxeoe` has a directly observable Edge secret inventory in this audit.
- `ebaquannrgbgjihbjfdc` does not expose a secret-list endpoint via the current MCP toolset, but historical reports show secret/runtime inconsistency there, especially around `OPENAI_API_KEY`.
- This is sufficient evidence that secret state is not being managed from a single authoritative environment.

### Documentation and script drift

Conflicting repository narratives exist:

- `docs/phase7-1c-project-creation-report.md` treats `ebaquannrgbgjihbjfdc` as the replacement BoothBridge backend
- `docs/phase7-4f-deployment-report.md` documents successful function deployment to `ebaquannrgbgjihbjfdc`
- `docs/phase7-5b-starting-point.md`, `docs/phase7-5c-live-validation-report.md`, `docs/phase7-5d-edge-function-deployment-report.md`, and `docs/phase7-6-end-to-end-validation-report.md` treat `jjqhmvfzqpohvukoxeoe` as canonical
- `scripts/phase7-4f/deploy-all-functions.mjs` still hard-codes `ebaquannrgbgjihbjfdc`
- `scripts/phase7-6-e2e-validation.mjs` defaults to `jjqhmvfzqpohvukoxeoe`

## 5. Canonical Environment Decision

**Canonical BoothBridge backend:** `jjqhmvfzqpohvukoxeoe`

### Why `jjqhmvfzqpohvukoxeoe` should be permanent

1. It is the only project with the BoothBridge schema actually applied.
2. It is the only project with live RLS, storage buckets, storage policies, and realtime publication members aligned with the application.
3. It is the project currently linked by local Supabase CLI metadata.
4. It is the target used by the latest end-to-end validation harness and the latest phase reports.
5. Adopting `ebaquannrgbgjihbjfdc` would require rebuilding the entire backend state that already exists on `jjqhmvfzqpohvukoxeoe`.

### Why not choose `ebaquannrgbgjihbjfdc`

- It has no BoothBridge schema or migration history.
- It has no buckets, no storage policies, no public-table policies, and no realtime publication members.
- Its strongest evidence is historical deployment activity, not current backend completeness.

### Why not merge environments

There is no meaningful database state on `ebaquannrgbgjihbjfdc` to merge back. The practical delta is:

- duplicate function deployment history
- possible secret/runtime differences
- at least one function version mismatch (`admin-auth`)

Those are easier to reconcile by standardizing on `jjqhmvfzqpohvukoxeoe` and treating `ebaquannrgbgjihbjfdc` as non-canonical.

## 6. Migration Recommendation

**Recommended path:** `adopt project A`

Where:

- **Project A** = `jjqhmvfzqpohvukoxeoe`
- **Project B** = `ebaquannrgbgjihbjfdc`

### Why `adopt project A` is the least risky option

- no schema rebuild is required
- no environment merge is required
- no data migration is currently indicated
- the repository is already partially reoriented toward `jjqhmvfzqpohvukoxeoe`
- the remaining work is consolidation and cleanup, not backend recreation

## 7. Repository Cleanup Recommendations

Perform these only **after** `jjqhmvfzqpohvukoxeoe` is explicitly accepted as canonical by the team.

### Obsolete deployment scripts and artifacts

- Remove or parameterize `scripts/phase7-4f/deploy-all-functions.mjs` because it hard-codes `ebaquannrgbgjihbjfdc`.
- Remove generated wrong-target deploy artifacts in `scripts/phase7-4f/`, especially:
  - `.deploy-summary.json`
  - `.mcp-call-*.json`
  - `.mcp-payload-*.json`
  - `.deploy-*.json`
  - `_deploy-*.json`
  - `.out-*.json`
  - `_tmp-*.json`

### Obsolete or superseded reports

Mark these as superseded or archive them out of the active Phase 7 path:

- `docs/phase7-1c-project-creation-report.md`
- `docs/phase7-4f-deployment-report.md`
- `docs/phase7-6b-stabilization-report.md`

These files remain useful as historical evidence, but they should no longer read like current operator guidance.

### Obsolete project references

- Replace remaining `ebaquannrgbgjihbjfdc` references in scripts and active documentation with `jjqhmvfzqpohvukoxeoe`, or mark those documents as historical.
- Remove `hffqcsbeyplaoejapzss` from active planning documents; keep it only where historical access diagnosis is needed.

### Temp and local-state cleanup

- Add `supabase/.temp/` to `.gitignore`.
- Exclude local temp files such as `supabase/.temp/cli-latest` and `supabase/.temp/pgdelta/pgdelta-target-ca.crt` from review and commits.

### External environment cleanup

Because there is no tracked Vercel config or tracked `.env*` file, the actual runtime environment is being controlled outside the repository. After canonical selection:

- ensure preview/production env vars reference only `jjqhmvfzqpohvukoxeoe`
- remove any remaining `ebaquannrgbgjihbjfdc` URL or key material from Vercel, CI, and team vault entries
- ensure operator runbooks use only one project ref

## 8. Remaining Risks

1. **Access is still split across identities and tools.**  
   CLI access is aligned to `jjqhmvfzqpohvukoxeoe`, while MCP access is aligned to `ebaquannrgbgjihbjfdc`. Until that is unified, accidental wrong-target actions remain likely.

2. **Historical documentation can still mislead the next operator.**  
   The repository currently contains two contradictory "current environment" stories.

3. **Project B secret state is not fully enumerable from the current MCP toolset.**  
   The available evidence is enough to reject it as canonical, but not enough to fully inventory every runtime secret there.

4. **Canonical backend health issues from Phase 7.6 remain separate follow-up work.**  
   Environment consolidation answers *which* backend is canonical. It does not resolve platform issues already recorded against that canonical backend.

5. **Local temp state is not ignored.**  
   `supabase/.temp/` currently acts like live operator state inside the repo working tree, which increases confusion and review noise.

STOP — Environment inconsistency detected
