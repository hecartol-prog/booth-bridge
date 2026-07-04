# Phase 7.6B - Stabilization & Defect Resolution

**Generated:** 2026-07-04  
**Repository:** `booth-bridge`  
**Canonical Supabase project for BoothBridge:** `jjqhmvfzqpohvukoxeoe`

## Scope

This phase targeted the three remaining Phase 7.6 issues without introducing architectural changes:

1. Notification creation under recipient-only RLS
2. AI provider configuration and execution
3. Registration throttling diagnosis

## Environment Notes

The canonical Supabase project for this repository is `jjqhmvfzqpohvukoxeoe`.

This phase should be interpreted against that canonical environment. Any earlier non-canonical access path or validation mismatch is superseded by the later repository consolidation and project-ref remediation work.

## Issue 1 - Notification creation

### Root cause

The Phase 7.6 diagnosis was correct.

- `notification` rows are insertable by authenticated users
- `notification` rows are selectable only by the recipient under RLS
- the generic Supabase entity abstraction always performed:

```js
insert(...).select("*").single()
```

That readback shape is incompatible with recipient-only visibility. Sender-side notification creation therefore failed even when the insert itself was allowed.

### Fix implemented

The abstraction was updated so entities can opt out of immediate readback on create.

- `src/utils/supabaseEntity.js`
  - added `options.selectAfterInsert`
  - when `false`, `create()` now performs `insert(record)` without `select("*").single()`
- `src/utils/dbClient.js`
  - added an entity-specific option for `Notification`
  - `Notification` now uses `{ selectAfterInsert: false }`

This preserves the current RLS model and does not broaden notification visibility.

### Why an Edge Function is not required here

An Edge Function would be a cleaner long-term server-owned notification path if BoothBridge later wants:

- trusted server-side notification composition
- centralized auditing
- canonical post-insert response payloads

But it is **not required** to resolve the current defect. The defect is caused by the client abstraction demanding sender readback, not by the insert policy itself. The localized abstraction fix is the smallest safe change for this phase.

### Validation result

- Local code fix: **implemented**
- Lint check on edited files: **pass**
- Live schema-backed notification regression on the accessible project: **blocked**

Blocker details:

- the accessible live project has no exposed `public` tables
- `public.notification` is absent from the PostgREST schema cache
- therefore the fixed notification path could not be re-exercised end-to-end against a migrated live schema in this environment

## Issue 2 - AI provider

### Root cause

The accessible project has deployed AI functions, but live runtime verification failed for all five targets because the function runtime reported:

```text
OPENAI_API_KEY is not configured.
```

Observed configuration state:

- `OPENAI_API_KEY`: secret name present in project secret metadata, but **not available at function runtime**
- `AI_PROVIDER`: not set, so code defaults to `openai`
- `AI_MODEL`: not set, so code defaults to `gpt-4o`

This means the active runtime is effectively operating as:

- provider: `openai` (default)
- model: `gpt-4o` (default)
- API key: **missing in runtime**

### Fix implemented

No client code changes were made, per requirement.

No safe secret rotation was possible from this workstation because:

- there is no replacement `OPENAI_API_KEY` available in the local environment
- the runtime failure is caused by missing runtime availability of the secret, not by a client-side bug

### Validation results

Authenticated live invocation results on the canonical BoothBridge project:

| Function | Result |
|---|---|
| `ai-health` | Fail - `500`, `OPENAI_API_KEY is not configured.` |
| `ai-chat` | Fail - `500`, `OPENAI_API_KEY is not configured.` |
| `ai-generate` | Fail - `500`, `OPENAI_API_KEY is not configured.` |
| `ai-document` | Fail - `500`, `OPENAI_API_KEY is not configured.` |
| `ai-business-card` | Fail - `500`, `OPENAI_API_KEY is not configured.` |

### Required production action

On the intended live project:

1. set a valid `OPENAI_API_KEY` in Edge Function secrets
2. optionally set `AI_PROVIDER=openai` explicitly for clarity
3. optionally set `AI_MODEL=gpt-4o` explicitly for deterministic runtime selection
4. redeploy or otherwise verify that the function runtime actually receives the secrets
5. re-run the five authenticated AI probes

## Issue 3 - Registration

### Root cause

The registration problem is **not** application client code.

Live probes showed:

- first hosted `signUp()` request succeeded and triggered confirmation email flow
- the next hosted `signUp()` request failed with:
  - status `429`
  - code `over_email_send_rate_limit`
  - message `email rate limit exceeded`

Auth logs also showed the confirmation email sending event for the first signup, followed by the rate-limit rejection for the next signup.

Diagnosis:

- this is an **email throttling / SMTP configuration / test-environment limit** problem
- it is consistent with using Supabase's default hosted email service instead of a production SMTP provider
- it is **not** a reason to disable protections globally

### Appropriate production configuration

For production BoothBridge registration:

1. Configure a custom SMTP provider in Supabase Auth.
2. Keep signup protections enabled.
3. Tune Auth email/rate-limit settings in the dashboard for expected launch volume instead of weakening them globally.
4. Keep email confirmations enabled if product/security requirements still expect verified email ownership.

Recommended production posture:

- custom SMTP enabled
- project-specific email throughput sized for expected signup traffic
- confirmation email delivery tested with the real sender domain
- no blanket disabling of Supabase rate limits

### Validation result

- Signup flow reachable: **pass**
- Confirmation email dispatch path reachable: **pass**
- Repeated signup under hosted default email path: **fail** (`429 over_email_send_rate_limit`)

## Regression Summary

### Auth

- Password sign-in for temporary validation users: **pass**
- Temporary auth users created for validation were cleaned up after the investigation: **pass**

### Notifications

- Local abstraction regression fix: **pass**
- Live database-backed retest: **blocked** by missing schema on the accessible project

### AI

- All five targeted probes: **fail**
- Blocking reason: runtime secret unavailable (`OPENAI_API_KEY is not configured.`)

### Registration

- Root cause reproduced and isolated: **pass**
- Production-ready registration throughput: **fail** until custom SMTP and rate-limit tuning are applied on the intended live project

### RLS / Storage / Realtime

These could not be truthfully re-confirmed on the accessible project because the project does not contain the migrated public schema:

- `public` tables are absent from the active project's REST schema
- notification/RLS/realtime paths therefore cannot be exercised meaningfully there
- storage-backed app validation was not repeated because the prerequisite schema environment is not the intended migrated target

Prior Phase 7.6 evidence for those areas remains historical only; it was **not** revalidated successfully in this phase on a correct live environment.

## Remaining Risks

1. **Wrong or incomplete live environment**
   - The accessible project has deployed Edge Functions and Auth, but no migrated `public` schema.
   - Notification, RLS, storage, and realtime validation are therefore blocked.

2. **AI runtime secrets are not usable**
   - The function runtime cannot read `OPENAI_API_KEY`.
   - All AI entrypoints remain non-operational.

3. **Registration is still not production-ready**
   - The default hosted email path throttles signup confirmation traffic.
   - Custom SMTP and production auth rate-limit tuning are still required.

4. **Notification fix still needs live confirmation on the intended migrated project**
   - The code change is minimal and correct for the diagnosed defect.
   - End-to-end live confirmation remains pending because the accessible project lacks the relevant schema.

## Conclusion

Phase 7.6B successfully produced the minimal code fix for notification creation and isolated the remaining platform blockers with live evidence. However, the accessible Supabase environment is not in a state where the required database-backed regressions can pass, and AI remains blocked by missing runtime secret availability.

STOP — Issues detected
