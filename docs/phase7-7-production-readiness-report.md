# BoothBridge Phase 7.7 Production Readiness Report

**Generated:** 2026-07-04  
**Repository:** `booth-bridge`  
**Branch:** `migration/base44-independence`  
**Scope:** final audit only; no runtime switch, no deploy, no UI behavior change  
**Current runtime:** `VITE_DATA_BACKEND=base44` (unchanged)

## Executive Summary

The Supabase migration is close to operationally complete: the repository now has a Supabase client path, private storage buckets, broad RLS coverage, Edge Functions, realtime publication setup, and an OpenRouter-first AI gateway design. The frontend also appears clean from a key-exposure standpoint: client code uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and no service-role key path to the browser was found.

However, this branch is **not yet production-ready for enabling the Supabase runtime**. The most important blockers are:

1. **Admin privilege trust is unsafe** because multiple code paths accept `user_metadata.role` / `user_metadata.user_role`, and the UI can write role values into mutable user metadata.
2. **Private storage is not fully app-ready** because many pages still render raw `file_url` / `logo_url` / `image_url` values directly even though the canonical buckets are private and intended to be accessed through signed URLs.
3. **Environment consolidation is incomplete** because the repository still contains conflicting Supabase project references, no tracked env source-of-truth, and no tracked Vercel/CI config enforcing the final cutover variables.
4. **AI gateway operations are not production-grade yet** because routing order is hardcoded, health checks are not completion-grade, server-side provider logging is missing, and worst-case failover latency is too high.

## Final Recommendation

Status: `NOT READY`

Do not enable the Supabase runtime until the blocking issues below are resolved and the production checklist is completed.

## Blocking Issues

### 1. Mutable user metadata can influence admin access

**Severity:** blocking

Evidence:

- `supabase/functions/_shared/auth.ts` accepts admin role from `user.app_metadata.role` **or** `user.user_metadata.role` / `user.user_metadata.user_role`
- `supabase/functions/admin-auth/index.ts` relies on that helper
- `src/api/supabaseAuth.js` merges `app_metadata.role || user_metadata.role`
- `src/api/authClient.js` exposes `updateUserMetadata()`
- `src/components/layout/AppLayout.jsx` writes `role: "admin"` and `role: "user"` into user metadata

Why this matters:

- `raw_user_meta_data` is user-editable and must not be trusted for authorization.
- This creates a privilege-escalation path for UI/admin detection and for the unauthenticated `admin-auth` edge function.

Required action before cutover:

- All admin authorization decisions must rely only on server-controlled claims, database-backed entitlements, or `app_metadata`.
- Remove any path that writes authorization role state into user-editable metadata.

### 2. Current storage security model and current UI behavior are misaligned

**Severity:** blocking

Evidence:

- `supabase/migrations/093_storage_setup.sql` makes all three buckets private
- `supabase/migrations/094_storage_policies.sql` scopes object access by authenticated owner/folder
- `src/utils/assetPipeline.js` explicitly says raw storage refs must be resolved via signed URLs
- multiple pages still render stored refs directly rather than resolving signed URLs first

Why this matters:

- The storage design is correct for private assets, but many pages still behave as if `file_url` is publicly fetchable.
- Enabling the Supabase runtime in this state is likely to break catalog, media, logo, or document rendering unless bucket privacy is weakened, which would be the wrong fix.

Important additional gap:

- `src/config/storageBuckets.js` defines `events/{eventId}/branding/...`
- `supabase/migrations/094_storage_policies.sql` does **not** include a matching `event_branding` path policy

Required action before cutover:

- Validate every user-visible asset path against the private-bucket signed-URL flow.
- Either add policy coverage for `event_branding` or remove/defer that storage path from production use.

### 3. Canonical environment cleanup is incomplete

**Severity:** blocking

Evidence:

- local link artifacts point to `jjqhmvfzqpohvukoxeoe`:
  - `supabase/.temp/project-ref`
  - `supabase/.temp/linked-project.json`
- active deployment helper had not yet been standardized on the canonical project:
  - `scripts/phase7-4f/deploy-all-functions.mjs`
- validation harness defaults to `jjqhmvfzqpohvukoxeoe`:
  - `scripts/phase7-6-e2e-validation.mjs`
- older docs still reference superseded non-canonical project history

Assessment:

- The intended canonical Supabase project is clearly `jjqhmvfzqpohvukoxeoe`.
- The repository is **not yet fully consolidated** around that single project.

Why this matters:

- Wrong-target deploys, secret drift, and operator confusion remain likely.
- There is no tracked `.env.example`, no tracked `vercel.json`, and no tracked `.github/workflows/*` encoding the final production variables.

Required action before cutover:

- Standardize all active operator docs, scripts, deployment helpers, and secret inventories on `jjqhmvfzqpohvukoxeoe` only.
- Create a single canonical environment-variable checklist for preview and production.

### 4. AI gateway is architecturally improved but not yet production-hardened

**Severity:** blocking

Evidence:

- route order is hardcoded in `supabase/functions/_shared/aiGateway.ts`
- `ai-health` is implemented in `supabase/functions/ai-health/index.ts`
- shared response metadata is added in `supabase/functions/_shared/handler.ts`
- current docs and prior reports show the canonical environment previously depended on direct OpenAI, while the new gateway expects OpenRouter-first

Current route order:

1. `deepseek` via OpenRouter
2. `qwen` via OpenRouter
3. `zhipu` via OpenRouter
4. `moonshot` via OpenRouter
5. `openai` via OpenRouter
6. `claude` via OpenRouter
7. `gemini` via OpenRouter
8. direct `openai` via `OPENAI_API_KEY`

Why this matters:

- A full OpenRouter outage can still walk most or all of the chain because each route is tried sequentially with `AI_REQUEST_TIMEOUT_MS` defaulting to 45 seconds.
- The health endpoint checks provider reachability via `/models`, not a real completion path, so it does not fully validate live request execution.
- Provider-selection "logging" is only returned to callers as response metadata; there is no explicit operator-facing server log, trace, or metric emission.
- Routing is only env-driven; it is not policy-driven per capability, region, or degraded mode.

Required action before cutover:

- Confirm production secrets for the new OpenRouter-first path are present on the canonical project.
- Add operator-visible request logging/metrics for selected provider, gateway, attempts, final status, and latency.
- Reduce or constrain worst-case failover latency before putting live user traffic on this chain.

## Security Review

### Service role exposure

**Result:** pass

Findings:

- No client bundle path exposing `SUPABASE_SERVICE_ROLE_KEY` was found.
- Browser-facing Supabase config is limited to:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` appears only in Edge Function code, scripts, and documentation.

### Anon-only exposure

**Result:** pass with caveats

Findings:

- Frontend Supabase initialization in `src/api/supabaseClient.js` uses anon-only exposure.
- The main client/backend switch in `src/config/backend.js` does not expose any privileged server secret.
- Caveat: anon-only frontend exposure is good, but the unauthenticated `admin-auth` function combined with wildcard CORS and mutable-role trust is still a backend security issue.

### Edge Function secrets

**Result:** mixed

Confirmed server-side requirements:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY` for the new primary route
- optional direct fallback: `OPENAI_API_KEY`
- optional routing overrides: `AI_PROVIDER`, `AI_MODEL`, `AI_MODEL_<PROVIDER>`, `AI_MODEL_OPENAI_DIRECT`, `AI_REQUEST_TIMEOUT_MS`
- optional OpenRouter attribution: `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_NAME`
- legacy optional admin env mode: `ADMIN_EMAIL`, `ADMIN_PASSWORD`

Gaps:

- The checked-in function README does not fully document every AI env variable the code now uses.
- Prior environment inventory for the canonical project listed `OPENAI_API_KEY` but not `OPENROUTER_API_KEY`; this must be re-verified before any cutover.

### RLS coverage

**Result:** strong in repo; hosted state should still be re-confirmed at cutover

Findings:

- `supabase/migrations/092_enable_rls.sql` enables RLS across the application tables and uses authenticated-only policies.
- The core admin SQL helper `private.is_admin()` correctly reads `auth.jwt() -> 'app_metadata' ->> 'role'`, not mutable user metadata.
- Prior live validation (`docs/phase7-6-end-to-end-validation-report.md` and `docs/phase7-6c-environment-consolidation-report.md`) recorded:
  - `39 / 39` public tables with RLS enabled
  - `94` public-table policies
  - anonymous and non-owner restrictions behaving as expected

Main caveat:

- The database-side admin model is sound, but app and edge-function code outside RLS still reintroduce mutable-role trust.

### Storage security

**Result:** strong policy posture; application-readiness gap remains

Findings:

- Buckets are private by default.
- Storage policies scope access to owner/folder patterns for media, assets, and OCR paths.
- The missing `event_branding` policy path is the main storage-policy gap found in code.
- The broader risk is not bucket security itself, but the current UI's expectation that private refs can be used as direct browser URLs.

## Environment Review

### Required environment variables

#### Frontend / Vercel

Required for Supabase cutover:

- `VITE_DATA_BACKEND=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Strongly recommended:

- `VITE_APP_URL`
- `VITE_AI_ENABLED` (if AI should be controllable independently)

#### Edge Functions / Supabase

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY` for the new default AI path

Optional but operationally relevant:

- `OPENAI_API_KEY`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_MODEL_<PROVIDER>`
- `AI_MODEL_OPENAI_DIRECT`
- `AI_REQUEST_TIMEOUT_MS`
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

#### Operational / validation-only

- `SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

These are not frontend runtime variables, but they are still relevant to validation and operator tooling.

### Detected unused or legacy variables

Still active in the current Base44 runtime path, but legacy relative to the final Supabase target:

- `VITE_BASE44_APP_ID`
- `VITE_BASE44_APP_BASE_URL`
- `VITE_BASE44_FUNCTIONS_VERSION`
- `BASE44_*`
- `PHASE6_*`

Likely removable after full cutover or after explicit deprecation:

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` if env-based admin auth is not intentionally retained
- `OPENAI_API_KEY` if direct OpenAI fallback is intentionally removed

### Missing or not codified production variables

Not tracked in the repository and therefore not provable from source control alone:

- final Vercel preview values
- final Vercel production values
- final canonical Supabase secrets for the OpenRouter-first AI path
- final OAuth redirect allow-lists for production and preview domains

Practical implication:

- The repository does not yet contain a single executable source-of-truth for production env setup.

### Duplicate project references

Observed refs:

- canonical intended project: `jjqhmvfzqpohvukoxeoe`
- stale active deploy target references
- historical/inactive project references

### Canonical project decision

**Assessment:** only one canonical Supabase project should remain, and that project should be `jjqhmvfzqpohvukoxeoe`.  
**Current repository state:** that decision is visible, but not fully enforced yet.

## AI Gateway Review

### Provider ordering

**Result:** verified

The provider order is centralized and explicit in `supabase/functions/_shared/aiGateway.ts`, which is good for consistency.

### Configurable routing

**Result:** insufficient

Current state:

- gateway choice is configurable only at a coarse env level
- model overrides exist
- route ordering itself is hardcoded

Recommended next step:

- move ordered routing, direct-fallback toggles, per-capability routing, and degraded-mode behavior into declarative config

### Health endpoint completeness

**Result:** incomplete for production operations

Current `ai-health` strengths:

- reports selected provider
- reports fallback provider
- reports active model
- returns route plan and provider-health details

Current gaps:

- requires auth and `POST`
- only does a live probe when `ping: true`
- validates `/models`, not a real completion call
- does not expose a distinct gateway-version field
- probes sequentially, which can be slow in degraded conditions

### Provider logging strategy

**Result:** inadequate

Current state:

- response metadata includes attempts, gateway, and fallback provider
- no explicit server-side structured log or durable audit trail was found

Recommendation:

- add operator-visible logging/metrics with request correlation IDs
- capture selected provider, failover count, latency, status code, and final outcome

### Failover behavior

**Result:** functionally correct, operationally risky

Strengths:

- retries `429`, `5xx`, timeout, and provider-unavailable style failures
- stops immediately on non-retryable auth failures

Gaps:

- full-chain retries can take multiple minutes in the worst case
- there is no circuit breaker or cooldown
- repeated outages will keep re-walking the same long chain
- request-level `req.model` does not propagate consistently across all fallback routes

## Performance Review

### Query hotspots

Main risk patterns found:

- `src/utils/supabaseEntity.js` uses `select("*")` for `list()`, `filter()`, and `get()`
- admin and operations pages do broad client-side aggregation/filtering after full-row fetches
- examples include:
  - `src/pages/LiveEventControlRoom.jsx`
  - `src/pages/EventSupportCenter.jsx`
  - `src/pages/admin/AdminDashboard.jsx`
  - `src/pages/admin/AdminDataQuality.jsx`
  - `src/pages/OrganizerCommandCenter.jsx`
  - `src/pages/EventReadinessCenter.jsx`

Assessment:

- this is a meaningful scalability risk, but not the primary cutover blocker if current row counts are still modest

### Storage usage

Main findings:

- storage buckets are private, which is correct
- asset rendering is inconsistent with the signed-URL model
- some later fixes could accidentally introduce per-row signed-URL overhead in render paths if not planned carefully

### Realtime subscriptions

Main findings:

- realtime publication is intentionally limited to `connection` and `meeting`, which is good
- `src/utils/supabaseEntity.js` subscribes at table scope, not per-user row scope
- clients invalidate/refetch whole lists after each event

Assessment:

- acceptable for low-to-moderate write volume
- likely noisy and expensive under heavier live-event traffic

### Edge Function cold-start considerations

Main findings:

- AI edge wrappers are thin, which helps
- every authenticated AI request calls `auth.getUser(token)` through `validateJwt()`
- health probing is sequential and can multiply latency under failures
- repeated failover attempts can turn a cold start plus provider degradation into a slow user-facing timeout

Assessment:

- cold start itself is not the biggest problem
- compounded auth and failover latency is the real concern

## Production Checklist

### Supabase

- [ ] Confirm `jjqhmvfzqpohvukoxeoe` is the only canonical project in active runbooks and operator tooling
- [ ] Reconfirm migrations, RLS, storage buckets, storage policies, and realtime publication on the canonical project
- [ ] Reconfirm hosted Auth settings for production domains, password policy, and email confirmation behavior
- [ ] Remove or archive wrong-target deployment helpers and stale project references

### Vercel

- [ ] Set `VITE_DATA_BACKEND=supabase` only in the cutover environment, not earlier
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the canonical project only
- [ ] Set `VITE_APP_URL` for preview and production domains
- [ ] Confirm no legacy non-canonical Supabase URL or key material remains in preview or production envs

### Storage

- [ ] Verify all user-facing asset pages resolve signed URLs before rendering private assets
- [ ] Verify `event_branding` is either policy-backed or excluded from production use
- [ ] Confirm no one is planning to make buckets public as a workaround

### OAuth

- [ ] Confirm Google and LinkedIn redirect URLs are allow-listed for preview and production
- [ ] Run one browser-backed OAuth callback test on the Supabase runtime before cutover
- [ ] Confirm password reset redirect flow uses the correct `VITE_APP_URL`

### Edge Functions

- [ ] Confirm deployed function versions on the canonical project only
- [ ] Confirm required secrets exist on the canonical project, especially `OPENROUTER_API_KEY`
- [ ] Restrict or harden `admin-auth` if it remains deployed
- [ ] Add server-side logging and basic alerting for edge failures

### AI Gateway

- [ ] Confirm OpenRouter-first secrets and routing work live on the canonical project
- [ ] Run a live completion smoke test, not just `ai-health`
- [ ] Decide whether direct OpenAI fallback should remain enabled
- [ ] Reduce worst-case failover latency or add a circuit-breaker strategy
- [ ] Add explicit provider-selection logs/metrics

### Monitoring

- [ ] Add alerts for edge-function error rate, auth failures, provider auth errors, and latency spikes
- [ ] Track storage signed-URL failures and 404/403 asset fetches
- [ ] Track Supabase query latency for the largest admin/analytics views

### Rollback

- [ ] Keep the current Base44 runtime path ready as the rollback target
- [ ] Prepare a cutover checklist that can revert only env/runtime selection without schema rollback
- [ ] Confirm rollback owners and decision thresholds before the switch

### DNS

- [ ] Confirm `boothbridge.app` and any preview domains match auth redirect allow-lists
- [ ] If OpenRouter referer restrictions are used, confirm production and preview domains are included

### Secrets

- [ ] Inventory all canonical secrets in one operator-visible checklist
- [ ] Remove stale secrets tied to non-canonical projects
- [ ] Decide whether `OPENAI_API_KEY` is required or intentionally optional
- [ ] Remove legacy admin env credentials unless intentionally retained

## Remaining Risks

These risks matter even if the main blockers are fixed:

1. The repo still lacks a tracked env source-of-truth, so future drift is likely unless a canonical env spec is added.
2. Several high-value admin and event-control pages rely on broad client-side querying and local aggregation, which may become a bottleneck at larger scale.
3. Realtime subscriptions are intentionally narrow, but current client invalidation is table-wide rather than user- or event-scoped.
4. The checked-in local `supabase/config.toml` is not production-hardened by itself; hosted dashboard settings must be verified independently.
5. Prior Phase 7.6 validation recorded additional cutover-sensitive gaps outside this audit's core scope, including cross-user notification creation on the current abstraction layer and incomplete browser-backed OAuth validation.

## Nice-to-Have Improvements

These are worthwhile, but they should follow blocker resolution rather than replace it:

- move AI provider priority and per-capability routing into config
- add a gateway-version field to `ai-health`
- add circuit breakers and provider cooldowns
- replace `select("*")` query patterns with narrower projections
- replace notification polling counts with count-only or push-driven approaches
- scope realtime subscriptions more narrowly before large live-event usage
- add `.env.example` / operator env documentation and stop relying on scattered docs
- ignore `supabase/.temp/` to reduce review noise and operator confusion

## Go / No-Go Assessment

### Strengths

- no service-role key exposure to the client was found
- anon-only frontend Supabase exposure is in place
- repository RLS posture is strong and aligns with prior live validation
- storage buckets are private and policy-based
- Edge Function structure is consistent and centralized
- AI routing logic is centralized rather than duplicated across functions

### No-Go Reasons

- unsafe mutable-role trust remains in app and edge auth paths
- current UI behavior is not aligned with private storage asset delivery
- active environment references are still split across more than one Supabase project
- AI gateway operations are not yet production-grade or fully live-validated for the new OpenRouter-first path

## Verdict

Final recommendation: `NOT READY`

The Supabase migration is materially advanced, but enabling `VITE_DATA_BACKEND=supabase` now would introduce unacceptable security, asset-delivery, and operational risk. Resolve the blocking issues first, then rerun a short pre-cutover verification focused on admin authorization, private asset rendering, canonical env values, and live AI gateway execution on the canonical project.
