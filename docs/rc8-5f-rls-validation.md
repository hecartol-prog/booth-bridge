# RC8.5F — RLS Validation

Date: 2026-07-08

## Evidence Executed

- `supabase db query --linked` RLS coverage queries
- RC7.6 runtime E2E harness output: `C:\Users\hecto\AppData\Local\Temp\rc85-e2e.json`

## Verification Matrix

| Check | Status | Evidence |
|---|---|---|
| Anonymous users blocked | **PASS** | E2E `anonymous_company_read_count=0`, insert denied by RLS policy. |
| Authenticated users scoped | **PASS** | E2E non-owner company read count 0; non-owner booth read count 0. |
| Company isolation | **PASS** | Owner can read own company, non-owner cannot read cross-company company row. |
| Cross-company access blocked | **PASS** | Non-owner booth/company reads blocked. |
| Meeting ownership/participant access | **PASS** | Meeting CRUD and realtime updates for participants succeeded. |
| Notification ownership | **PASS WITH WARNINGS** | Recipient reads pass; sender read count 0 as expected by policy, but sender-side insert readback defect exists in db client abstraction. |

## Coverage Summary

- Public tables with RLS enabled: **39** (queried from `pg_class` + `relrowsecurity`).
- Public policy rows sampled from `pg_policies` show authenticated/admin and owner/participant patterns across core entities.

## Result

**PASS WITH WARNINGS**

### Warning

Known defect from E2E report: sender-side notification create flow can fail when create path requires immediate row re-select under recipient-only SELECT policy.

