# Phase 7.5C Live Validation Report

**Date:** 2026-07-04  
**Branch:** `migration/base44-independence`  
**Canonical project:** `jjqhmvfzqpohvukoxeoe`  
**Scope:** Apply Phase 7.5B security migrations to the live canonical Supabase project, then perform read-only validation.  

## Final Recommendation
### **STOP — Issues detected**

The security migrations applied successfully to the canonical project and all requested database/storage/realtime checks passed. However, the canonical project does **not** currently have the expected Edge Functions deployed, so the live platform is not yet ready to advance to Phase 7.6.

## 1. Migration Execution Log

### Pre-flight confirmation
- Confirmed local Supabase link points to `jjqhmvfzqpohvukoxeoe` via:
  - `supabase/.temp/project-ref`
  - `supabase/.temp/linked-project.json`
  - `supabase projects list`
- Confirmed live project status: `ACTIVE_HEALTHY`

### Dry run
Command:

```bash
supabase db push --linked --dry-run
```

Dry run result:
- only pending migrations were:
  - `092_enable_rls.sql`
  - `093_storage_setup.sql`
  - `094_storage_policies.sql`
  - `095_realtime.sql`

### Live apply
Command:

```bash
supabase db push --linked
```

Execution result:
- `092_enable_rls.sql` applied successfully
- `093_storage_setup.sql` applied successfully
- `094_storage_policies.sql` applied successfully
- `095_realtime.sql` applied successfully

Observed notes:
- `DROP POLICY IF EXISTS` statements emitted expected `NOTICE ... does not exist, skipping` messages on first apply
- no SQL execution failure occurred
- post-apply CLI warning:
  - failed to cache migrations catalog because local Docker Desktop / local engine was unavailable
  - this did **not** block the remote migration apply

### Post-apply validation
Command:

```bash
supabase db push --linked --dry-run
```

Result:
- `Remote database is up to date.`

## 2. Migration History Verification

Live migration history summary from the canonical project:

- total applied migrations: `47`
- first migration: `001`
- last migration: `095`
- versions `090` through `095` present in order:
  - `090`
  - `091`
  - `092`
  - `093`
  - `094`
  - `095`

Local repository migration file count:
- `47` SQL migration files under `supabase/migrations`

Conclusion:
- existing schema history `001` through `091` remains present
- new migrations appended cleanly as `092` through `095`
- no migration ordering issue detected

## 3. RLS Verification

Live read-only SQL verification returned:

- public tables: `39`
- tables with RLS enabled: `39`
- public-table policies: `94`

Verified public tables:

- `activity`
- `admin_access_log`
- `billing_subscription`
- `billing_transaction`
- `booth`
- `buyer_profile`
- `catalog_item`
- `company`
- `connection`
- `event`
- `exhibitor_profile`
- `integration_connection`
- `integration_sync_log`
- `lead_intelligence`
- `lead_interaction`
- `lead_profile`
- `match_recommendation`
- `media`
- `meeting`
- `meeting_request`
- `nfc_interaction`
- `nfc_product_tag`
- `nfc_profile`
- `notification`
- `opportunity_post`
- `premium_booth_subscription`
- `product`
- `project_supplier_mapping`
- `rfi`
- `saved_booth`
- `saved_product`
- `scanned_contact`
- `sourcing_project`
- `sponsored_listing`
- `stress_test_result`
- `support_ticket`
- `system_alert`
- `user`
- `verification_profile`

Conclusion:
- all `39` public tables now have RLS enabled
- expected public policy count `94` matches live state

## 4. Storage Verification

### Buckets
Verified live buckets:

- `boothbridge-assets`
  - `public = false`
  - `file_size_limit = 104857600`
  - MIME types:
    - `image/*`
    - `video/*`
    - `application/pdf`

- `boothbridge-media`
  - `public = false`
  - `file_size_limit = 52428800`
  - MIME types:
    - `image/*`
    - `video/*`
    - `application/pdf`
    - `application/msword`
    - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

- `boothbridge-ocr`
  - `public = false`
  - `file_size_limit = 15728640`
  - MIME types:
    - `image/*`
    - `application/pdf`

### Storage policies
Verified live storage policy count on `storage.objects`:

- `16`

Conclusion:
- all 3 required private buckets exist
- bucket configuration matches the migration
- storage policy count matches expected

## 5. Realtime Verification

Verified live `supabase_realtime` publication members in `public`:

- `connection`
- `meeting`

Conclusion:
- realtime publication matches the implemented minimal subscription set

## 6. Edge Function Validation

### Live inventory result
Command:

```bash
supabase functions list
```

Live result on canonical project:
- `functions = []`

### Direct endpoint existence checks
HTTP checks against the canonical project returned:

- `https://jjqhmvfzqpohvukoxeoe.functions.supabase.co/ai-health` → `404`
- `https://jjqhmvfzqpohvukoxeoe.functions.supabase.co/admin-auth` → `404`
- `https://jjqhmvfzqpohvukoxeoe.functions.supabase.co/ai-chat` → `404`

### Local expected function set
Local repository still contains 10 function entrypoints:

- `admin-auth`
- `ai-business-card`
- `ai-chat`
- `ai-classify`
- `ai-document`
- `ai-generate`
- `ai-health`
- `ai-match`
- `ai-recommend`
- `ai-summary`

### Important finding
The prior deployment report in `docs/phase7-4f-deployment-report.md` documents deployment to:

- `jjqhmvfzqpohvukoxeoe`

That is **not** the canonical project for this phase.

Conclusion:
- the canonical project `jjqhmvfzqpohvukoxeoe` does **not** currently have the expected Edge Functions deployed
- therefore the requirement **“Edge Functions still deploy correctly”** is **not satisfied** for the canonical project

## 7. Read-only Validation Summary

Checks that passed:

- security migrations applied successfully
- no failed SQL statements during apply
- post-apply dry run reports remote database up to date
- `39` public tables present
- `39` tables with RLS enabled
- `94` public-table policies present
- `16` storage policies present
- `3` required storage buckets present
- realtime publication contains `connection` and `meeting`
- migration history is continuous through `095`
- no application code changes were made in this phase

Checks that failed:

- live canonical project does not currently expose the expected Edge Functions

## 8. Remaining Risks

### Blocking
1. **Canonical Edge Functions are missing**
   - live inventory is empty
   - direct function URLs return `404`
   - production parity with prior function migration/deployment is not present on the canonical project

### Non-blocking but important
2. **Advisor warnings remain**
   - security warning: mutable `search_path` on:
     - `public.set_updated_date`
     - `private.is_admin`
   - performance warnings:
     - `auth_rls_initplan` on multiple policies using direct `auth.*` evaluation
     - `multiple_permissive_policies` due admin + owner/participant permissive policy combinations

3. **MCP Supabase server was not usable in this session**
   - MCP calls returned permission errors
   - validation was completed via Supabase CLI instead

## 9. Production Readiness Score

**Score: 60 / 100**

Rationale:
- database security foundation is now live and validated
- storage and realtime configuration are live and validated
- migration history is clean
- but canonical live platform readiness is materially reduced because the expected Edge Functions are absent from the target project

## 10. Required Next Action

Before Phase 7.6, deploy the 10 Edge Functions to the canonical project `jjqhmvfzqpohvukoxeoe` and re-run a live function inventory plus endpoint smoke check on that same project.
