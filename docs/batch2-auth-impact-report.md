# Batch 2 — Auth Impact Report

**Date:** 2026-06-15  
**Phase:** 2 — Batch 2 (auth core)  
**Branch:** `migration/base44-independence`  
**Commit audited:** `74d1898` (*Phase 2 batch 1 utility and offline sync abstraction*)  
**Prerequisite:** Batch 0 complete (`36db55a` — authClient extensions)  
**Default backend:** `VITE_DATA_BACKEND=base44` (unchanged)

---

## 1. Executive Summary

Batch 2 replaces direct `base44.auth` and `base44.functions.invoke("adminAuth")` usage in **7 auth-core files** with the Phase 1 `authClient` module. Batch 0 already added the missing methods (`setToken`, `resendOtp`, `resetPassword`, object-form `verifyOtp`); **no further authClient extensions are required** for Batch 2 to compile and delegate correctly on Base44.

**Batch 2 scope (7 files):**

| File | `base44.auth` calls | `base44.functions` calls | Other Base44 usage |
|------|----------------------|--------------------------|---------------------|
| `src/lib/AuthContext.jsx` | 4 | 0 | `@base44/sdk` axios client for public settings |
| `src/pages/Login.jsx` | 3 | 0 | — |
| `src/pages/Register.jsx` | 5 | 0 | — |
| `src/pages/ForgotPassword.jsx` | 1 | 0 | — |
| `src/pages/ResetPassword.jsx` | 1 | 0 | — |
| `src/pages/AdminLogin.jsx` | 0 | 1 | `base44.entities.AdminAccessLog.create` |
| `src/lib/PageNotFound.jsx` | 1 | 0 | — |

**Totals in Batch 2 scope:** 15 `base44.auth` call sites, 1 `base44.functions` call site, 1 entity call (AdminLogin logging — out of auth scope but blocks full `base44Client` removal in that file).

**Additional auth-related files in phase2-impact-report §3.2 (later batches):** `Onboarding.jsx`, `Profile.jsx`, `AppLayout.jsx` — documented in §8 for cross-batch visibility; not in Batch 2 execution order.

**Risk level:** **Medium–High** — concentrated in Register OTP (`verifyOtp` → `setToken` chain) and AuthContext bootstrap (public-settings HTTP + `me()`). AdminLogin response shape is stable if `auth.adminLogin` preserves `functions.invoke` wrapper.

---

## 2. authClient State at Commit `74d1898`

Batch 0 (`36db55a`) extended `src/api/authClient.js`. All methods needed by Batch 2 files exist and delegate to Base44 when `isBase44()` is true.

| authClient export | Base44 delegate | Batch 2 consumer |
|-------------------|-----------------|------------------|
| `getCurrentUser` | `base44.auth.me()` | AuthContext, PageNotFound |
| `loginWithEmailPassword` | `loginViaEmailPassword` | Login |
| `loginWithProvider` | `loginWithProvider` | Login, Register |
| `register` | `register` | Register |
| `verifyOtp` | `verifyOtp({ email, otpCode })` or `confirmSignUp` fallback | Register |
| `setToken` | `setToken(access_token)` | Register |
| `resendOtp` | `resendOtp(email)` | Register |
| `requestPasswordReset` | `resetPasswordRequest` | ForgotPassword |
| `resetPassword` | `resetPassword({ resetToken, newPassword })` | ResetPassword |
| `logout` | `logout(redirectUrl?)` | AuthContext |
| `redirectToLogin` | `redirectToLogin(returnUrl)` | AuthContext |
| `checkAppReady` | axios `GET …/public-settings/by-id/{appId}` | AuthContext (replace inline axios) |
| `adminLogin` | `functions.invoke("adminAuth", …)` | AdminLogin |

**Not used in Batch 2:** `updateUserMetadata`, `updatePassword`, `onAuthStateChange`, `isAdminSession`.

Default export:

```javascript
import { auth } from "@/api/authClient";
// or: import * as authClient from "@/api/authClient";
```

---

## 3. Complete `base44.auth` Call Inventory

Every `base44.auth.*` call site in auth-related files listed in [phase2-impact-report.md](./phase2-impact-report.md) §3.2.

### 3.1 Batch 2 files

#### `src/lib/AuthContext.jsx`

| Line | Call | Arguments | Return usage |
|------|------|-----------|--------------|
| 102 | `base44.auth.me()` | none | Assigned to `currentUser`; drives `user`, `isAuthenticated` |
| 129 | `base44.auth.logout()` | `window.location.href` | Side effect only (redirect + token cleanup) |
| 132 | `base44.auth.logout()` | none | Side effect only |
| 138 | `base44.auth.redirectToLogin()` | `window.location.href` | Side effect only |

**Non-auth Base44 in same file:**

| Line | Call | Notes |
|------|------|-------|
| 28–38 | `createAxiosClient` + `appClient.get('/prod/public-settings/by-id/…')` | Direct `@base44/sdk/dist/utils/axios-client` import; replace with `auth.checkAppReady()` |

**authClient mapping:**

| Current | Replace with |
|---------|--------------|
| `base44.auth.me()` | `auth.getCurrentUser()` |
| `base44.auth.logout(url)` / `logout()` | `auth.logout(url)` / `auth.logout()` |
| `base44.auth.redirectToLogin(url)` | `auth.redirectToLogin(url)` |
| Inline axios public-settings | `auth.checkAppReady()` |

---

#### `src/pages/Login.jsx`

| Line | Call | Arguments | Return usage |
|------|------|-----------|--------------|
| 40 | `base44.auth.loginViaEmailPassword()` | `(email, password)` | Awaited; success → `window.location.href = "/"` |
| 64 | `base44.auth.loginWithProvider()` | `("google", "/")` | Fire-and-forget (OAuth redirect) |
| 68 | `base44.auth.loginWithProvider()` | `("linkedin", "/")` | Fire-and-forget |

**authClient mapping:**

| Current | Replace with |
|---------|--------------|
| `loginViaEmailPassword(email, password)` | `auth.loginWithEmailPassword(email, password)` |
| `loginWithProvider(provider, path)` | `auth.loginWithProvider(provider, path)` *(unchanged signature)* |

---

#### `src/pages/Register.jsx`

| Line | Call | Arguments | Return usage |
|------|------|-----------|--------------|
| 33 | `base44.auth.register()` | `{ email, password }` | Awaited; success → show OTP UI |
| 46 | `base44.auth.verifyOtp()` | `{ email, otpCode }` | `result?.access_token` read |
| 48 | `base44.auth.setToken()` | `result.access_token` | Sync; not awaited |
| 61 | `base44.auth.resendOtp()` | `email` | Awaited; toast on success |
| 72 | `base44.auth.loginWithProvider()` | `("google", "/")` | Fire-and-forget |

**authClient mapping:**

| Current | Replace with |
|---------|--------------|
| `register({ email, password })` | `auth.register({ email, password })` |
| `verifyOtp({ email, otpCode })` | `auth.verifyOtp({ email, otpCode })` |
| `setToken(access_token)` | `auth.setToken(access_token)` |
| `resendOtp(email)` | `auth.resendOtp(email)` |
| `loginWithProvider("google", "/")` | `auth.loginWithProvider("google", "/")` |

---

#### `src/pages/ForgotPassword.jsx`

| Line | Call | Arguments | Return usage |
|------|------|-----------|--------------|
| 19 | `base44.auth.resetPasswordRequest()` | `email` | Return ignored; errors swallowed in empty `catch` |

**authClient mapping:**

| Current | Replace with |
|---------|--------------|
| `resetPasswordRequest(email)` | `auth.requestPasswordReset(email)` |

---

#### `src/pages/ResetPassword.jsx`

| Line | Call | Arguments | Return usage |
|------|------|-----------|--------------|
| 28 | `base44.auth.resetPassword()` | `{ resetToken, newPassword }` | Awaited; success → redirect `/login` |

**authClient mapping:**

| Current | Replace with |
|---------|--------------|
| `resetPassword({ resetToken, newPassword })` | `auth.resetPassword({ resetToken, newPassword })` *(same signature)* |

---

#### `src/lib/PageNotFound.jsx`

| Line | Call | Arguments | Return usage |
|------|------|-----------|--------------|
| 14 | `base44.auth.me()` | none | User object; checks `user.role === 'admin'` |

**authClient mapping:**

| Current | Replace with |
|---------|--------------|
| `base44.auth.me()` | `auth.getCurrentUser()` |

---

#### `src/pages/AdminLogin.jsx`

No `base44.auth` calls. See §4 for function invocation.

---

### 3.2 Auth-related files — deferred batches (§3.2 inventory, not Batch 2)

#### `src/pages/Onboarding.jsx` (Batch 5 / onboarding flow)

| Line | Call | Arguments |
|------|------|-----------|
| 180 | `base44.auth.me()` | none |
| 204 | `base44.auth.updateMe()` | `{ user_role: "exhibitor", onboarded: true, profile_id }` |
| 232 | `base44.auth.updateMe()` | `{ user_role: "buyer", onboarded: true, profile_id }` |

Also uses `base44.integrations.Core.*` and `base44.entities.*` — mixed batch.

**authClient mapping:** `getCurrentUser`, `updateUserMetadata`.

---

#### `src/pages/Profile.jsx` (auth & onboarding group)

| Line | Call | Arguments |
|------|------|-----------|
| 238 | `base44.auth.logout()` | `"/login"` |

Also uses `base44.entities.ExhibitorProfile` / `BuyerProfile`.

**authClient mapping:** `auth.logout("/login")`.

---

#### `src/components/layout/AppLayout.jsx` (Batch 3)

| Line | Call | Arguments |
|------|------|-----------|
| 64 | `base44.auth.updateMe()` | `{ user_role, role: "user" }` |
| 70 | `base44.auth.updateMe()` | `{ role: "admin" }` |
| 188 | `base44.auth.logout()` | `"/login"` |

Also uses `base44.entities.Notification.filter`.

**authClient mapping:** `updateUserMetadata`, `logout`.

---

### 3.3 Grand total — all §3.2 auth files

| SDK method | Call sites | Files |
|------------|------------|-------|
| `me()` | 3 | AuthContext, PageNotFound, Onboarding |
| `logout()` | 4 | AuthContext ×2, AppLayout, Profile |
| `redirectToLogin()` | 1 | AuthContext |
| `loginViaEmailPassword()` | 1 | Login |
| `loginWithProvider()` | 3 | Login ×2, Register |
| `register()` | 1 | Register |
| `verifyOtp()` | 1 | Register |
| `setToken()` | 1 | Register |
| `resendOtp()` | 1 | Register |
| `resetPasswordRequest()` | 1 | ForgotPassword |
| `resetPassword()` | 1 | ResetPassword |
| `updateMe()` | 4 | AppLayout ×2, Onboarding ×2 |
| **Total `base44.auth`** | **22** | **10 files** |

---

## 4. Complete `base44.functions` Invocation Inventory

| File | Line | Invocation | Arguments | Response usage |
|------|------|------------|-----------|----------------|
| `src/pages/AdminLogin.jsx` | 84 | `base44.functions.invoke("adminAuth", …)` | `{ email: email.trim(), password }` | `res.data?.success` truthy check |
| `src/api/authClient.js` | 161 | *(delegate — not a Batch 2 target)* | `{ email, password }` | Same shape returned to callers |

**Server response** (`base44/functions/adminAuth/entry.ts`): HTTP body `{ success: true }` on match; `{ error: "…" }` on failure.

**SDK wrapper:** `functions.invoke` exposes axios-style `{ data: { success: true } }`, which is why AdminLogin reads `res.data?.success`.

**authClient mapping:**

```javascript
// Before
const res = await base44.functions.invoke("adminAuth", { email: email.trim(), password });

// After
const res = await auth.adminLogin(email.trim(), password);
```

**AdminLogin mixed dependency:** Line 31 uses `base44.entities.AdminAccessLog.create(entry)` for audit logging. Batch 2 auth swap alone **cannot** remove the `base44Client` import from AdminLogin; entity swap to `db.AdminAccessLog.create` is a separate mechanical change (same batch file, second import).

---

## 5. Required authClient Mappings (Batch 2)

Mechanical substitution table for the 7 Batch 2 files. Import change on every file:

```javascript
// Remove
import { base44 } from "@/api/base44Client";

// Add
import { auth } from "@/api/authClient";
```

| File | Remove | Add (`auth.*`) |
|------|--------|----------------|
| `AuthContext.jsx` | `base44.auth.me` | `auth.getCurrentUser` |
| | `base44.auth.logout` | `auth.logout` |
| | `base44.auth.redirectToLogin` | `auth.redirectToLogin` |
| | `createAxiosClient` + inline GET | `auth.checkAppReady` |
| | `import createAxiosClient from '@base44/sdk/…'` | *(remove)* |
| `Login.jsx` | `loginViaEmailPassword` | `loginWithEmailPassword` |
| | `loginWithProvider` | `loginWithProvider` |
| `Register.jsx` | `register`, `verifyOtp`, `setToken`, `resendOtp`, `loginWithProvider` | Same names on `auth` |
| `ForgotPassword.jsx` | `resetPasswordRequest` | `requestPasswordReset` |
| `ResetPassword.jsx` | `resetPassword` | `resetPassword` |
| `PageNotFound.jsx` | `me` | `getCurrentUser` |
| `AdminLogin.jsx` | `functions.invoke("adminAuth", …)` | `adminLogin` |

### Method rename reference (SDK name → authClient name)

| Base44 SDK | authClient export |
|------------|-------------------|
| `me()` | `getCurrentUser()` |
| `loginViaEmailPassword()` | `loginWithEmailPassword()` |
| `resetPasswordRequest()` | `requestPasswordReset()` |
| `updateMe()` | `updateUserMetadata()` |
| `resetPassword({ resetToken, newPassword })` | `resetPassword({ resetToken, newPassword })` *(identical)* |
| `verifyOtp({ email, otpCode })` | `verifyOtp({ email, otpCode })` *(identical)* |
| `register`, `setToken`, `resendOtp`, `logout`, `redirectToLogin`, `loginWithProvider` | Same method names on `auth` |

---

## 6. Response-Shape Incompatibilities

Analysis of consumer expectations vs `authClient` return values on Base44 backend.

| Flow | Consumer expectation | authClient behavior | Risk |
|------|---------------------|---------------------|------|
| **Register OTP verify** | `verifyOtp` returns object with `access_token`; passed to `setToken` | Delegates to SDK; object payload supported | **Low** on Base44 — authClient probes `verifyOtp` / `confirmSignUp`. If SDK returns token under a different key (e.g. `token`), Register redirect would fail silently (no token set). **Manual test required.** |
| **Register setToken** | Sync call, no await | `auth.setToken` is sync; throws if SDK lacks method | **Low** — Batch 0 added guard |
| **Admin login** | `res.data?.success === true` | `adminLogin` returns raw `functions.invoke` result | **None** — shape preserved by design (JSDoc on `adminLogin`) |
| **AuthContext public settings** | Full axios response assigned to `appPublicSettings` | `checkAppReady()` returns same `appClient.get()` response | **None** if AuthContext assigns return value directly |
| **AuthContext me()** | User object with optional `status` on error | `getCurrentUser()` = `me()` | **None** |
| **AuthContext auth errors** | Reads `error.status`, `error.data?.extra_data?.reason` on public-settings failure | Errors from `checkAppReady()` are same axios errors | **None** |
| **PageNotFound me()** | `user.role === 'admin'` for admin note | Same user object via `getCurrentUser()` | **None** |
| **Forgot password** | Ignores success/failure | `requestPasswordReset` propagates errors but page catches all | **None** |
| **Reset password** | `err.message` on failure | Same SDK errors | **None** |
| **Login email** | `err.message` string matching | Same SDK errors | **None** |
| **loginWithProvider** | OAuth redirect; no return value used | Sync delegate | **None** |

### Supabase path (Phase 5 — not Batch 2)

All `authClient` Supabase branches currently call `supabaseNotReady()` and throw. No response-shape work needed until Phase 5.

---

## 7. Aliases and authClient Extensions

### 7.1 Extensions required for Batch 2

**None.** Batch 0 (`36db55a`) already implemented:

- `setToken(access_token)`
- `resendOtp(email)`
- `resetPassword({ resetToken, newPassword })`
- Object-form `verifyOtp({ email, otpCode })`

### 7.2 Optional aliases (not required; reduce rename churn)

`authClient` does **not** export SDK-compatible alias names. Batch 2 refactors must rename at call sites **or** add aliases to the `auth` export object:

| Proposed alias | Maps to | Used by (future batches) |
|----------------|---------|----------------------------|
| `me` | `getCurrentUser` | Ergonomic only; Batch 2 uses rename |
| `updateMe` | `updateUserMetadata` | AppLayout, Onboarding (Batch 3/5) |
| `loginViaEmailPassword` | `loginWithEmailPassword` | Optional; Login renames once |
| `resetPasswordRequest` | `requestPasswordReset` | Optional; ForgotPassword renames once |

**Recommendation:** Rename at call sites in Batch 2 (7 files, 15 auth call sites). Defer alias additions unless grep shows widespread SDK name retention.

### 7.3 Files needing non-authClient changes (Batch 2 scope)

| File | Issue | Action |
|------|-------|--------|
| `AuthContext.jsx` | `@base44/sdk/dist/utils/axios-client` import | Remove; use `auth.checkAppReady()` |
| `AdminLogin.jsx` | `base44.entities.AdminAccessLog.create` | Swap to `db.AdminAccessLog.create` to eliminate `base44Client` import (entity layer; same file) |

No authClient code changes required for either item.

---

## 8. Per-File Refactor Checklist (Batch 2)

| # | File | Import swap | Auth call swaps | Other Base44 | Post-refactor grep |
|---|------|-------------|-----------------|--------------|-------------------|
| 1 | `AuthContext.jsx` | `auth` from authClient | 4 auth calls + checkAppReady | Remove `@base44/sdk` axios | Zero `base44`, zero `@base44/sdk` |
| 2 | `Login.jsx` | `auth` | 3 calls (1 rename) | — | Zero `base44` |
| 3 | `Register.jsx` | `auth` | 5 calls | — | Zero `base44` |
| 4 | `ForgotPassword.jsx` | `auth` | 1 call (rename) | — | Zero `base44` |
| 5 | `ResetPassword.jsx` | `auth` | 1 call | — | Zero `base44` |
| 6 | `PageNotFound.jsx` | `auth` | 1 call (rename) | — | Zero `base44` |
| 7 | `AdminLogin.jsx` | `auth` + `db` | `adminLogin` | `AdminAccessLog` → `db` | Zero `base44` |

---

## 9. Validation Plan (Batch 2 sign-off)

### Automated

- [ ] `npm run build` — exit 0
- [ ] `grep -r "base44" src/lib/AuthContext.jsx src/lib/PageNotFound.jsx src/pages/Login.jsx src/pages/Register.jsx src/pages/ForgotPassword.jsx src/pages/ResetPassword.jsx src/pages/AdminLogin.jsx` → **0 matches**
- [ ] `grep -r "@base44/sdk" src/lib/AuthContext.jsx` → **0 matches**

### Manual smoke (auth-critical)

- [ ] Cold load app — AuthContext bootstrap, public settings, token → user load
- [ ] Email login → redirect home
- [ ] Google + LinkedIn OAuth from Login
- [ ] Register → OTP → verify → home (confirm session persists after `setToken`)
- [ ] Resend OTP during register
- [ ] Forgot password — success message regardless of email existence
- [ ] Reset password with valid `?token=` query param
- [ ] Admin login — success → `/admin`; failure → lockout after 5 attempts
- [ ] 404 page — admin note visible when logged in as admin
- [ ] Logout from AuthContext path (expired token / auth_required flow)

---

## 10. Cross-Batch Auth Remaining (after Batch 2)

| Batch | File | Auth calls remaining |
|-------|------|---------------------|
| 3 | `AppLayout.jsx` | `updateMe` ×2, `logout` |
| 5 | `Onboarding.jsx` | `me`, `updateMe` ×2 |
| — | `Profile.jsx` | `logout` |

**22 total `base44.auth` call sites** across §3.2; **15** removed by Batch 2 → **7** remain in later batches.

---

## 11. Related Documents

- [phase2-impact-report.md](./phase2-impact-report.md) — §3.2 auth inventory, Batch 2 execution order
- [phase1-foundation-report.md](./phase1-foundation-report.md) — authClient design
- [base44-dependency-map.md](./base44-dependency-map.md) — SDK surface (partially stale on OTP methods)
- [project-state-june-2026.md](./project-state-june-2026.md) — branch handoff

---

*Report generated from static audit at commit `74d1898`. No code modified.*
