# RC10.7 — Final Verification Report

**Date:** 2026-07-10  
**Auditor:** Regression audit (post-implementation)  
**Verdict:** **PASS** — single source of truth confirmed for runtime onboarding architecture

---

## Executive verdict

| Check | Result |
|-------|--------|
| 1. No JWT writes for `onboarded` | **PASS** |
| 2. No JWT writes for `user_role` | **PASS** |
| 3. All onboarding decisions trace to `public.user` | **PASS** |
| 4. No `window.location.href` after onboarding | **PASS** |
| 5. No race between `completeOnboarding` → `applyUser` → `navigate` | **PASS** |
| 6. Exactly one source of truth | **PASS** |

Automated validation: `npm run validate:rc10-7-onboarding` — all checks passed.

---

## 1. JWT metadata write audit

### Search performed

```
rg 'updateUser\(' src/
rg 'user_metadata' src/
rg 'onboarded|user_role|profile_id' src/api/
```

### Findings

| Location | `auth.updateUser` call | Writes onboarding fields? |
|----------|------------------------|---------------------------|
| `supabaseAuth.js` `supabaseUpdatePassword` | `{ password }` | No |
| `supabaseAuth.js` `supabaseCompletePasswordReset` | `{ password }` | No |
| `supabaseAuth.js` `supabaseCompleteOnboarding` | **None** | No — writes `public.user` only |
| `supabaseAuth.js` `supabaseUpdateUserMetadata` | **None** | No — delegates to `completeOnboarding` for onboarding fields |
| `supabaseAuth.js` `supabaseRegister` | `signUp({ data: metadata })` | No — only `first_name`, `last_name`, `company`, `job_title`, `phone`, `country` |

### Confirmed

- **No production code writes `onboarded` into JWT metadata.**
- **No production code writes `user_role` into JWT metadata.**
- **No production code writes `profile_id` into JWT metadata.**

`supabaseCompleteOnboarding` comment and implementation align:

```224:245:src/api/supabaseAuth.js
/**
 * Persist onboarding-related app state to public.user only.
 * Onboarding fields are NOT written to user_metadata (RC10.7 — avoids JWT staleness).
 */
export async function supabaseCompleteOnboarding({ user_role, profile_id }) {
  // ...
  await syncAppUserRow(userData.user.id, {
    user_role,
    onboarded: true,
    profile_id,
  });
  // refreshSession + mergeAppUser — no updateUser({ data })
}
```

### Non-runtime exception (test harness only)

`scripts/phase7-6-e2e-validation.mjs` seeds `userMetadata: { user_role, onboarded }` when creating test users via the Admin API. This is **not** application runtime code and does **not** affect the SPA onboarding architecture. RC10.7 merge logic ignores these JWT values at read time.

---

## 2. JWT metadata read audit

### Search performed

```
rg 'meta\.(onboarded|user_role|profile_id)' src/
rg 'user_metadata\.(onboarded|user_role|profile_id)' src/
```

### Findings

**Zero matches** in `src/`. No code reads onboarding fields from JWT metadata for decisions.

### Read path

`buildAppUserModel()` in `src/api/appUserModel.js`:

- Strips `user_role`, `onboarded`, `profile_id`, `role` from metadata via `extractProfileMetadata()`
- Sets onboarding fields **only** from `appRow` (`public.user`)
- No metadata fallback (`??` / `||` on meta for these fields)

Legacy JWT copies of onboarding fields may still exist in `auth.users` for pre-RC10.7 accounts but are **inert** at runtime.

---

## 3. Onboarding decision traceability

Every gate and redirect ultimately resolves against `public.user` (directly or via `mergeAppUser` which reads `public.user`).

| Decision point | Mechanism | Ultimate source |
|----------------|-----------|-----------------|
| `OnboardedGuard` fast path | `isOnboardingComplete(user)` | `user` from AuthContext → populated by `mergeAppUser` → `public.user` |
| `OnboardedGuard` verify path | `auth.getAppUserOnboardingState(user.id)` | **Direct** `public.user` SELECT |
| `Onboarding.jsx` reverse guard | `getAppUserOnboardingState` fallback | **Direct** `public.user` SELECT |
| `isOnboardingComplete()` | `row.onboarded && row.user_role` | Whatever row was passed (always DB-derived in guards) |
| Page `user_role` checks | `user?.user_role` from AuthContext | `mergeAppUser` → `public.user` |

**No onboarding redirect or allow decision reads JWT metadata.**

---

## 4. Hard navigation audit (post-onboarding)

### `Onboarding.jsx`

```
rg 'window\.location' src/pages/Onboarding.jsx
```

**Result:** No matches.

Completion navigation:

```370:371:src/pages/Onboarding.jsx
      applyUser(refreshedUser);
      navigate("/", { replace: true });
```

### Remaining `window.location.href` in repository (not onboarding-related)

| File | Purpose | Onboarding impact |
|------|---------|-------------------|
| `authClient.js` | Post-logout redirect | None |
| `supabaseAuth.js` `redirectToLogin` | Unauthenticated redirect | None |
| `AuthContext.jsx` | Passes current URL to logout/login | None |
| `Login.jsx` | **Removed** — now `navigate` | Fixed in RC10.7 |
| `AppLayout.jsx` | Admin impersonation mode switch | None |
| `AdminLogin.jsx` | Admin shell entry | None |
| `ResetPassword.jsx` | Post-reset login | None |
| `PageNotFound.jsx` | 404 home link | None |
| `debug/exportReport.js` | Captures URL for report | None |

**Confirmed: no `window.location.href` remains in the onboarding completion path.**

---

## 5. Race condition analysis

### Completion sequence (actual code order)

```
handleFinish()
  ├─ await db.ExhibitorProfile / BuyerProfile create|update   (profile FK target)
  ├─ refreshedUser = await auth.completeOnboarding(...)
  │    ├─ await syncAppUserRow()          → public.user committed
  │    ├─ await refreshSession()          → session rotated
  │    └─ return await mergeAppUser()     → fresh public.user read
  ├─ applyUser(refreshedUser)             → synchronous React setState
  └─ navigate("/", { replace: true })     → client-side route change
```

All steps are **sequentially awaited**. `navigate` cannot fire before `applyUser` receives the merged user.

### Concurrent `onAuthStateChange`

`refreshSession()` inside `completeOnboarding` may trigger `AuthContext` `onAuthStateChange` → `checkUserAuth({ silent: true })`.

| Concern | Assessment |
|---------|------------|
| `checkUserAuth` overwrites `applyUser` with stale data | **Mitigated** — `mergeAppUser` reads `public.user` only; metadata cannot poison merge |
| `checkUserAuth` runs before `syncAppUserRow` completes | **Impossible** — `completeOnboarding` awaits sync before `refreshSession` |
| Guard redirects before context updates | **Mitigated** — `applyUser` runs before `navigate`; guard fast-path uses updated context |
| Guard redirects on stale context after navigate | **Mitigated** — DB verify path queries `public.user` before redirect |

### Residual UX note (not a functional race)

`OnboardedGuard` initial `gateState` is `"checking"`. After `applyUser` + `navigate`, one render cycle may show a brief spinner before the effect sets `"allow"`. This does **not** cause a redirect loop.

**Verdict: no functional race conditions remain between `completeOnboarding`, `applyUser`, and `navigate`.**

---

## 6. Dependency map

### `onboarded`

| Category | Location | Operation |
|----------|----------|-----------|
| **WRITES** | `supabaseAuth.syncAppUserRow` | UPSERT `public.user.onboarded` |
| **WRITES** | `supabaseAuth.supabaseCompleteOnboarding` | Sets `onboarded: true` via `syncAppUserRow` |
| **WRITES** | `AdminUsers.jsx` | **Read/display only** in UI; edit dialog does not mutate `onboarded` |
| **READS** | `supabaseAuth.fetchAppUserOnboardingState` | SELECT `public.user.onboarded` |
| **READS** | `supabaseAuth.mergeAppUser` | SELECT via `buildAppUserModel` |
| **READS** | `appUserModel.isOnboardingComplete` | Boolean check on row |
| **READS** | `AdminUsers.jsx`, `AdminDashboard.jsx` | Admin list/display |
| **GUARDS** | `OnboardedGuard.jsx` | Blocks app routes if incomplete |
| **GUARDS** | `Onboarding.jsx` mount effect | Reverse guard (already onboarded → `/`) |

### `user_role`

| Category | Location | Operation |
|----------|----------|-----------|
| **WRITES** | `supabaseAuth.syncAppUserRow` | UPSERT `public.user.user_role` |
| **WRITES** | `supabaseAuth.supabaseCompleteOnboarding` | Via `syncAppUserRow` |
| **WRITES** | `AdminUsers.jsx` `updateMutation` | `db.User.update(id, { user_role })` → `public.user` |
| **READS** | `supabaseAuth.fetchAppUserOnboardingState` | SELECT `public.user.user_role` |
| **READS** | `supabaseAuth.mergeAppUser` | SELECT via `buildAppUserModel` |
| **READS** | `appUserModel.isOnboardingComplete` | Required for completion |
| **READS** | `Home.jsx`, `Profile.jsx`, `Connections.jsx`, `Meetings.jsx`, `ScanQR.jsx`, `DigitalBooth.jsx`, `BusinessCard.jsx`, `AppLayout.jsx` | Role-based UI |
| **READS** | `AdminUsers.jsx`, `AdminDashboard.jsx` | Admin display |
| **READS** | `sentryUser.js`, `debug/sections/index.jsx` | Observability |
| **GUARDS** | `OnboardedGuard.jsx` | Required with `onboarded` |
| **GUARDS** | `Onboarding.jsx` mount effect | Reverse guard |

### `profile_id` (on `public.user`)

| Category | Location | Operation |
|----------|----------|-----------|
| **WRITES** | `supabaseAuth.syncAppUserRow` | UPSERT `public.user.profile_id` |
| **WRITES** | `supabaseAuth.supabaseCompleteOnboarding` | Via `syncAppUserRow` |
| **READS** | `supabaseAuth.fetchAppUserOnboardingState` | SELECT `public.user.profile_id` |
| **READS** | `supabaseAuth.mergeAppUser` | SELECT via `buildAppUserModel` |
| **READS** | `sentryUser.js` | Sentry context (`companyId` fallback) |
| **GUARDS** | None directly — `profile_id` is not used in route guards |

> **Note:** `exhibitor_profile_id`, `buyer_profile_id`, `lead_profile_id` on other tables are FK columns on domain entities, not `public.user.profile_id`. They are out of scope for onboarding state SSOT.

---

## 7. Source of truth confirmation

```
┌─────────────────────────────────────────────────────────────┐
│                  SINGLE SOURCE OF TRUTH                     │
│                     public.user                             │
│   columns: user_role | onboarded | profile_id               │
└─────────────────────────────────────────────────────────────┘
         ▲                              │
         │ WRITE                          │ READ
         │                                ▼
  completeOnboarding()              mergeAppUser()
  syncAppUserRow()           fetchAppUserOnboardingState()
  AdminUsers db.User.update         isOnboardingComplete()
         │                                │
         │                                ▼
         │                         AuthContext.user
         │                                │
         │                    ┌───────────┴───────────┐
         │                    ▼                       ▼
         │             OnboardedGuard          Page components
         │             Onboarding guard
         │
  auth.users.user_metadata  ──X──>  NOT read for onboarding decisions
  (legacy values may exist, stripped by extractProfileMetadata)
```

| Field | Authoritative store | Read fallback | Write paths |
|-------|---------------------|---------------|-------------|
| `onboarded` | `public.user` | None | `completeOnboarding`, `syncAppUserRow` |
| `user_role` | `public.user` | None | `completeOnboarding`, `syncAppUserRow`, admin `db.User.update` |
| `profile_id` | `public.user` | None | `completeOnboarding`, `syncAppUserRow` |

**Exactly one source of truth per field: `public.user`.**

---

## 8. API surface audit

| API | Callers (runtime) | Writes JWT? | Writes `public.user`? |
|-----|-------------------|-------------|------------------------|
| `completeOnboarding()` | `Onboarding.jsx` | No | Yes |
| `updateUserMetadata()` | **None** (exported only) | No | Delegates to `completeOnboarding` if onboarding fields present |
| `getAppUserOnboardingState()` | `OnboardedGuard`, `Onboarding.jsx` | — | Read only |
| `refreshCurrentUser()` | `Onboarding.jsx` reverse guard | — | Read only |
| `mergeAppUser()` | All auth session paths | — | Read only |

---

## 9. Automated verification

```bash
npm run validate:rc10-7-onboarding
```

Validates:

- `public.user` values win over stale JWT metadata in merge
- Onboarding keys stripped from profile metadata spread
- No metadata fallback when `public.user` row is empty
- `isOnboardingComplete` logic

Output: `RC10.7 onboarding validation: all checks passed`

---

## 10. Residual notes (non-blocking)

| Item | Severity | Notes |
|------|----------|-------|
| Legacy JWT onboarding values in old accounts | Low | Ignored at read; harmless |
| `scripts/phase7-6-e2e-validation.mjs` seeds JWT metadata | Low | Test harness only; recommend aligning to `public.user` seed in future |
| `updateUserMetadata` still exported | Low | Dead code path for onboarding; safe wrapper |
| Brief guard spinner after navigate | Cosmetic | One-frame UX; no redirect loop |
| Admin can write `user_role` via admin panel | By design | Still writes to `public.user` — same SSOT |

---

## 11. Conclusion

RC10.7 successfully eliminates duplicate onboarding sources of truth:

1. **Writes** to onboarding state go exclusively to `public.user`.
2. **Reads** for onboarding decisions go exclusively to `public.user` (directly or via `mergeAppUser`).
3. **JWT metadata** is neither written nor read for `onboarded`, `user_role`, or `profile_id`.
4. **Onboarding completion** uses React Router without hard reload.
5. **Race conditions** from metadata/DB dual-write and `...meta` spread overwrite are removed.

**Regression audit: PASS.**
