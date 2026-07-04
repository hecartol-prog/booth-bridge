# BoothBridge Phase 7.7A Remediation Report

**Generated:** 2026-07-04  
**Repository:** `booth-bridge`  
**Authoritative audit input:** `docs/phase7-7-production-readiness-report.md`  
**Scope:** remediate Critical and High production-readiness issues without changing the live runtime, deploying, or altering intended user-facing behavior

## Executive Summary

Phase 7.7A remediation is complete at the repository level.

The highest-risk findings from the production-readiness audit were addressed in code, scripts, migrations, and operator documentation:

- admin authorization now relies on authenticated role claims from `app_metadata.role`
- stale Supabase project references were consolidated to the canonical project `jjqhmvfzqpohvukoxeoe`
- the AI gateway now supports deterministic provider ordering, bounded per-provider timeouts, and structured failure logging
- frontend exposure remains anon-only; service-role credentials stay server-side
- private storage rendering gaps were remediated with signed-URL resolution and a missing `event_branding` policy path

## Issues Fixed

### 1. Admin authorization hardened to claims-only

Fixed:

- removed `user_metadata.role` / `user_metadata.user_role` fallback from edge-function admin checks
- removed client-side admin-role derivation from mutable user metadata and public profile data
- stopped writing `role: "admin"` / `role: "user"` into user metadata during admin preview flows
- changed Supabase admin gating to rely on authenticated admin claims instead of a browser-only session flag
- normalized validation fixtures so admin test users carry admin authority in `app_metadata.role`, not `user_role`

Key files:

- `supabase/functions/_shared/auth.ts`
- `src/api/supabaseAuth.js`
- `src/api/authClient.js`
- `src/components/layout/AppLayout.jsx`
- `src/components/layout/AdminLayout.jsx`
- `src/pages/AdminLogin.jsx`
- `scripts/phase7-6-e2e-validation.mjs`

### 2. Canonical Supabase project consolidation completed

Fixed:

- updated the active deploy helper to target `jjqhmvfzqpohvukoxeoe`
- removed stale generated Phase 7.4F deploy payloads and request snapshots that still referenced non-canonical projects
- updated current operator and phase documentation so the repository now points to a single canonical Supabase project
- rewrote the environment consolidation report to reflect the post-cleanup canonical state

Key files:

- `scripts/phase7-4f/deploy-all-functions.mjs`
- `scripts/phase7-4f/` generated JSON artifacts removed
- `docs/phase7-1b-project-ownership-report.md`
- `docs/phase7-1c-project-creation-report.md`
- `docs/phase7-2a-authentication-report.md`
- `docs/phase7-4f-deployment-report.md`
- `docs/phase7-5b-starting-point.md`
- `docs/phase7-5c-live-validation-report.md`
- `docs/phase7-6b-stabilization-report.md`
- `docs/phase7-6c-environment-consolidation-report.md`
- `docs/phase7-7-production-readiness-report.md`
- `docs/phase7-remaining-migration-roadmap.md`

### 3. AI gateway resilience and logging improved

Fixed:

- introduced configurable OpenRouter provider ordering via `AI_PROVIDER_ORDER`
- retained deterministic fallback order by constructing the route plan from the configured provider list
- clamped per-provider request timeout to a maximum of 5000 ms to prevent long cascading waits
- preserved optional direct OpenAI fallback behind `AI_ENABLE_DIRECT_OPENAI_FALLBACK`
- added structured warn/error logs for failed provider attempts and terminal request failures
- extended health output with active routing, timeout, gateway version, and provider-health metadata
- parallelized unique health probes to keep health checks bounded

Key files:

- `supabase/functions/_shared/aiGateway.ts`
- `supabase/functions/_shared/handler.ts`
- `supabase/functions/ai-health/index.ts`

### 4. Frontend secret exposure verified

Verified:

- client-side wiring continues to use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- no service-role key is read from the frontend code path
- service-role usage remains confined to edge-function/server-side code

Relevant files checked:

- `src/api/supabaseClient.js`
- `src/config/backend.js`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/admin-auth/index.ts`

### 5. Production storage path alignment completed

Fixed:

- added signed-URL resolution in the Supabase entity layer for persisted private asset fields such as `file_url`, `logo_url`, `image_url`, `thumbnail_url`, `banner_url`, `product_image_url`, and `raw_image_url`
- patched immediate upload-preview flows so forms no longer try to render raw private storage refs before a DB round-trip
- added missing storage-policy coverage for `events/{eventId}/branding/...` under the `event_branding` path

Key files:

- `src/utils/supabaseEntity.js`
- `src/pages/OCRScanner.jsx`
- `src/pages/Products.jsx`
- `src/pages/Onboarding.jsx`
- `src/pages/ExhibitorSetupWizard.jsx`
- `src/pages/admin/AdminCatalogues.jsx`
- `src/pages/admin/AdminExhibitors.jsx`
- `supabase/migrations/094_storage_policies.sql`

## Files Modified

Primary implementation files modified in this remediation:

- `src/api/authClient.js`
- `src/api/supabaseAuth.js`
- `src/components/layout/AdminLayout.jsx`
- `src/components/layout/AppLayout.jsx`
- `src/pages/AdminLogin.jsx`
- `src/pages/OCRScanner.jsx`
- `src/pages/Products.jsx`
- `src/pages/Onboarding.jsx`
- `src/pages/ExhibitorSetupWizard.jsx`
- `src/pages/admin/AdminCatalogues.jsx`
- `src/pages/admin/AdminExhibitors.jsx`
- `src/utils/supabaseEntity.js`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/aiGateway.ts`
- `supabase/functions/_shared/handler.ts`
- `supabase/functions/ai-health/index.ts`
- `supabase/migrations/094_storage_policies.sql`
- `scripts/phase7-4f/deploy-all-functions.mjs`
- `scripts/phase7-6-e2e-validation.mjs`
- documentation files listed in the project-consolidation section above

Repository cleanup performed:

- removed stale generated deploy payloads and request snapshots under `scripts/phase7-4f/`

## Intentionally Deferred Issues

None within the requested Critical/High remediation scope.

Not performed by design in this phase:

- no runtime switch to `VITE_DATA_BACKEND=supabase`
- no deployment of updated edge functions
- no migration application against the live Supabase project

## Verification

Checks completed:

- repo-wide search no longer finds the superseded Supabase project refs
- `npm run build` passed
- targeted lint checks on edited implementation files passed

Additional note:

- `npm run lint` still reports a large pre-existing unused-import backlog across many unrelated frontend files; those issues were not introduced by this remediation and were outside scope

## Final Readiness Assessment

Final recommendation: `READY WITH MINOR ACTIONS`

The repository-level blockers from the Phase 7.7 audit were remediated. Before production cutover, operators still need to perform the normal non-code follow-through on the canonical project:

1. Apply the latest database migrations, including the updated storage policy in `supabase/migrations/094_storage_policies.sql`.
2. Deploy the updated edge functions to `jjqhmvfzqpohvukoxeoe`.
3. Rerun focused smoke checks on the canonical project for admin auth, AI health/failover, signed asset rendering, and storage uploads.

With those operational steps completed, the previously blocking findings are no longer expected to prevent Supabase cutover.
