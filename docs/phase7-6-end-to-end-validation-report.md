# BoothBridge Phase 7.6 End-to-End Validation Report

Date: 2026-07-04
Branch: `migration/base44-independence`
Canonical project: `jjqhmvfzqpohvukoxeoe`
Runtime default: `VITE_DATA_BACKEND=base44` (unchanged)

## Scope

Phase 7.6 focused on functional validation of the canonical Supabase backend without changing production application logic.

Validated areas:

- Authentication
- Representative CRUD and RLS behavior
- Storage buckets and policies
- Edge AI function reachability and authenticated execution
- Realtime subscriptions
- Abstraction-layer compatibility
- Build/regression under both backend modes

No client runtime switch was performed. No React code was modified. No database schema changes were made.

## Temporary Test Environment

Validation was executed with a temporary harness: `scripts/phase7-6-e2e-validation.mjs`.

Temporary test data policy:

- Temporary auth users were created for owner, non-owner, admin, password-reset, OTP, and CRUD scenarios.
- Temporary database rows were created only for validation targets.
- Temporary storage objects were uploaded to each canonical bucket.
- All temporary auth users, rows, and storage objects created by the harness were cleaned up at the end of each run.

This test data was for Phase 7.6 validation only.

## Authentication Validation

### Verified successfully

| Flow | Result | Notes |
|------|--------|-------|
| Login | Pass | Owner, non-owner, and admin test users all authenticated successfully. |
| Logout | Pass | Session cleared successfully. |
| Session refresh | Pass | `refreshSession()` returned a fresh session and rotated the access token. |
| Password reset flow | Pass | Verified via admin-generated recovery link + token-hash exchange + successful re-login with the new password. |
| OTP verification | Pass | Email OTP verification succeeded with both `type: "email"` and `type: "signup"` in current project behavior. |
| Google OAuth initiation | Pass (partial) | `signInWithOAuth()` returned a provider URL. Full browser callback was not completed in this CLI-only validation. |
| LinkedIn OAuth initiation | Pass (partial) | `signInWithOAuth()` returned a provider URL. Full browser callback was not completed in this CLI-only validation. |
| JWT generation | Pass | Authenticated sessions returned valid access tokens. |
| JWT validation | Pass | `auth.getUser()` resolved correctly from authenticated sessions. |
| `app_metadata.role` | Pass | Admin JWT carried `app_metadata.role = "admin"`. |
| Admin detection basis | Pass | Admin JWT claims and admin RLS behavior both confirmed the admin path. |

### Not fully validated

| Flow | Result | Reason |
|------|--------|--------|
| Register | Blocked | Public `signUp()` returned `email rate limit exceeded` during validation. |
| Full OAuth callback completion | Partial only | Initiation URLs were generated, but provider callback completion was not exercised without a browser session. |
| `mergeAppUser()` runtime execution | Partial only | Source behavior was inspected and its data assumptions were validated live, but the exact browser-side function was not executed directly in Node. |

### Auth observations

- Owner JWT claim `sub` matched the authenticated Supabase user ID.
- Owner JWT `role` was `authenticated`.
- Admin JWT `app_metadata.role` was `admin`.
- `public.user` rows were present for the main authenticated test users, which matches the expectations of `mergeAppUser()` in `src/api/supabaseAuth.js`.

### Auth risks

1. The register path could not be completed due to auth email rate limiting on the canonical project.
2. OAuth providers appear configured enough to initiate, but callback completion still needs browser-backed validation.

## CRUD Validation

Representative entities exercised with authenticated Supabase users:

| Entity | Create | Read | Update | Delete | Result |
|--------|--------|------|--------|--------|--------|
| `user` | Pass | Pass | Pass | Pass | Pass |
| `company` | Pass | Pass | Pass | Pass | Pass |
| `booth` | Pass | Pass | Pass | Pass | Pass |
| `product` | Pass | Pass | Pass | Pass | Pass |
| `meeting` | Pass | Pass | Pass | Pass | Pass |
| `connection` | Pass | Pass | Pass | Pass | Pass |
| `notification` | Pass | Pass | Pass | Pass | Pass for self-recipient flow; cross-user create path is defective (see defects). |

Notes:

- Validation targeted the actual RLS shapes in `supabase/migrations/092_enable_rls.sql`.
- CRUD was run through authenticated clients, not service-role shortcuts.
- `notification` required a self-recipient CRUD path to complete successfully because the sender-to-other-user abstraction path currently fails.

## RLS Validation

### Confirmed behavior

| Scenario | Result | Notes |
|----------|--------|-------|
| Anonymous read on `company` | Pass | Returned zero rows. |
| Anonymous insert on `company` | Pass | Rejected by RLS. |
| Authenticated non-owner read on `company` | Pass | Returned zero rows. |
| Authenticated non-owner read on `booth` | Pass | Returned zero rows. |
| Authenticated non-owner read on `product` | Pass | Allowed by policy (`product_authenticated_read`). |
| Owner read on owned `company` | Pass | Returned owned row. |
| Notification recipient read | Pass | Recipient could read the row. |
| Notification sender read | Pass | Sender could not read recipient-only row. |
| Admin read on `company` | Pass | Admin JWT could read owner row. |
| Admin read on `user` | Pass | Admin JWT could read another user's row. |

### RLS conclusion

The canonical project’s representative RLS model is functioning as designed for:

- anonymous
- authenticated non-owner
- owner
- admin

The main functional issue discovered was not the database policy itself, but the way the current app abstraction requests inserted notification rows back immediately after insert.

## Storage Validation

Buckets exercised:

- `boothbridge-media`
- `boothbridge-assets`
- `boothbridge-ocr`

### Verified successfully

| Bucket | Upload | Signed URL | Download | Ownership enforcement |
|--------|--------|------------|----------|------------------------|
| `boothbridge-media` | Pass | Pass | Pass | Other user could not generate a signed URL (`Object not found`). |
| `boothbridge-assets` | Pass | Pass | Pass | Other user could not download owner-scoped object (`Object not found`). |
| `boothbridge-ocr` | Pass | Pass | Pass | Object still existed after a non-owner delete attempt. |

### Storage policy interpretation

- Owner-scoped access paths behaved correctly for media, asset, and OCR objects.
- The non-owner OCR delete call returned no client error, but the object still existed afterward. This indicates policy enforcement was effective, while the storage client response for `remove()` is not a reliable signal of authorization success by itself.

## AI Validation

Authenticated JWTs were used for all AI probes.

Functions exercised:

- `ai-health`
- `ai-chat`
- `ai-generate`
- `ai-document`
- `ai-business-card`

### Results

| Function | Reachable | Authenticated request | Result |
|----------|-----------|-----------------------|--------|
| `ai-health` | Yes | Yes | Pass, but provider probe degraded |
| `ai-chat` | Yes | Yes | Fail |
| `ai-generate` | Yes | Yes | Fail |
| `ai-document` | Yes | Yes | Fail |
| `ai-business-card` | Yes | Yes | Fail |

### Response-envelope checks

Observed successfully:

- `success`
- `error`
- `provider`
- `latency`
- `usage`

For `ai-health`, provider and model fields were present and the response completed successfully.

### Provider selection and error handling

- Active provider resolved to `openai`
- `ai-health` provider probe status: `degraded`
- `ai-health` probe message: `HTTP 401`
- Authenticated AI function failures all returned provider-auth errors
- Authenticated invalid-request probe returned `400` with `INVALID_REQUEST`, confirming handler-level error shaping works

### Root cause

The canonical project’s `OPENAI_API_KEY` is present but invalid for live model execution.

Observed provider error pattern:

- `Incorrect API key provided`
- HTTP `401`
- Edge envelope code surfaced as `AI_AUTHENTICATION`

### AI conclusion

AI infrastructure is deployed and reachable, but live AI execution is blocked on invalid provider credentials. Phase 7.6 cannot sign off AI readiness until the canonical project’s OpenAI key is corrected or the provider configuration is switched to a valid alternative.

## Realtime Validation

Subscriptions exercised:

- `connection`
- `meeting`

Validated scenarios:

- INSERT propagation to both participants
- UPDATE propagation to both participants

### Result

| Subscription | INSERT propagation | UPDATE propagation | Result |
|--------------|--------------------|--------------------|--------|
| `connection` | Pass | Pass | Pass |
| `meeting` | Pass | Pass | Pass |

Realtime `postgres_changes` delivery was observed successfully for both owner and participant clients.

## Application Abstractions

### `authClient`

Live Supabase-backed paths validated:

- `register` (blocked by email rate limit, see auth section)
- `loginWithEmailPassword`
- `logout`
- `refresh`
- `requestPasswordReset`
- `verifyOtp`
- `signInWithGoogle`
- `signInWithLinkedIn`

`mergeAppUser()`:

- The exact browser-side function in `src/api/supabaseAuth.js` was not executed directly in Node.
- Its live data assumptions were validated:
  - auth user exists
  - `public.user` row exists
  - admin role claim is in `app_metadata.role`

### `dbClient`

`dbClient`/`makeSupabaseEntity` behavior was validated against live tables for:

- `user`
- `company`
- `booth`
- `product`
- `meeting`
- `connection`
- `notification`

Compatibility issue discovered:

- `notification` cross-user create is not compatible with the current generic `.insert(...).select("*").single()` abstraction.

### `storageClient`

Validated against the canonical bucket conventions used by:

- `src/api/storageClient.js`
- `src/api/supabaseStorage.js`
- `src/config/storageBuckets.js`

### `aiClient`

Validated against the deployed Supabase endpoints targeted by `src/api/supabaseAi.js`.

Compatibility conclusion:

- Endpoint mapping is correct.
- Runtime execution is blocked by invalid provider credentials, not by endpoint absence.

## Regression Results

Builds executed:

### 1. `VITE_DATA_BACKEND=base44`

Command:

```bash
npm run build
```

Result: Pass

### 2. `VITE_DATA_BACKEND=supabase`

Command executed with:

- `VITE_DATA_BACKEND=supabase`
- `VITE_SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<canonical anon key>`

Result: Pass

### Behavioral differences observed

- No compile-time build break was observed under either backend mode.
- Runtime default remains `base44`.
- Supabase-mode build does not prove full browser runtime parity by itself; live backend validation was required for that.

## Discovered Defects

1. **Cross-user notification creation breaks on the current Supabase data abstraction.**
   - `notification` rows are recipient-readable only under RLS.
   - `src/utils/supabaseEntity.js` always does `.insert(...).select("*").single()`.
   - `src/utils/dbClient.js` `sendNotification()` routes through that generic create path.
   - Result: sender-side creation for another user fails even though the insert policy itself allows it.

2. **Canonical AI provider credentials are invalid.**
   - `ai-health` succeeded but reported a degraded provider probe.
   - `ai-chat`, `ai-generate`, `ai-document`, and `ai-business-card` all failed with provider `401 invalid_api_key`.
   - Live AI execution is therefore not ready.

3. **Public register validation is currently blocked by auth email rate limiting.**
   - Repeated `signUp()` attempts returned `email rate limit exceeded`.
   - This prevented full completion of the normal register/email-delivery path during Phase 7.6.

## Recommended Fixes

1. **Fix notification creation for cross-user rows.**
   - Options:
     - Special-case `notification` create to avoid selecting the inserted row back as the sender, or
     - Add a sender-visible `SELECT` policy if that matches the product model, or
     - Route notification creation through a privileged server-side path.

2. **Replace the invalid `OPENAI_API_KEY` on the canonical project.**
   - Re-run `ai-health`, `ai-chat`, `ai-generate`, `ai-document`, and `ai-business-card` immediately after rotation.

3. **Review auth email rate limits / provider configuration before preview cutover.**
   - Ensure end-user registration can complete without hitting a restrictive email throttle during normal usage.

4. **Run one browser-backed OAuth callback pass before Phase 7.7.**
   - Google and LinkedIn initiation are configured well enough to produce URLs, but callback completion was not exercised in this CLI-only validation.

5. **Run one browser-backed `mergeAppUser()` smoke test after preview uses Supabase runtime.**
   - Live data assumptions are validated, but direct runtime execution of the browser abstraction still deserves one preview check.

## Verdict

STOP — Issues detected
