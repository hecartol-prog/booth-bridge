# Phase 7.4B — Authentication Migration Report

**Generated:** 2026-07-03  
**Scope:** Authentication abstraction only (`authClient`, `AuthContext`, admin guard)  
**Runtime default:** `VITE_DATA_BACKEND=base44` (unchanged)  
**Prior phase:** [7.4A dbClient migration](./phase7-4a-verification-report.md)

---

## Final recommendation

### **READY FOR PHASE 7.4C**

Authentication is fully abstracted behind `authClient.js`. Base44 remains the default runtime. Supabase auth paths are implemented and wired through `AuthContext`. No pages import `base44.auth` directly.

**Minor actions before Supabase preview auth testing:**

1. Configure Google and LinkedIn OAuth providers in Supabase Dashboard (credentials not required in repo).
2. Seed `public.user` rows linked to `auth.users` IDs during Phase 7.5.
3. Create admin test users with `app_metadata.role = 'admin'`.
4. Live smoke-test login, register, OAuth redirect, and admin panel on preview.

---

## 1. Authentication entry-point audit (pre-migration)

| Entry point | Pre-7.4B state | Post-7.4B |
|-------------|----------------|-----------|
| `AuthContext.jsx` | Already used `auth` from `authClient` | Supabase session listener + branch in `checkAppState` |
| `ProtectedRoute.jsx` | Used `useAuth()` only | Unchanged (no direct Base44) |
| `Login.jsx` | `auth.loginWithEmailPassword`, `auth.loginWithProvider` | Unchanged |
| `Register.jsx` | `auth.register`, `verifyOtp`, `setToken`, `resendOtp` | Unchanged |
| `ForgotPassword.jsx` | `auth.requestPasswordReset` | Unchanged |
| `ResetPassword.jsx` | `auth.resetPassword` | Unchanged |
| `AdminLogin.jsx` | `auth.adminLogin` | Unchanged |
| `AdminLayout.jsx` | Direct `sessionStorage bb_admin_authed` | `auth.isAdminSession()`, `auth.clearAdminSession()` |
| `AppLayout.jsx` | `auth.logout`, `auth.updateUserMetadata` | Unchanged |
| `Onboarding.jsx` | `auth.getCurrentUser`, `auth.updateUserMetadata` | Unchanged |
| `PageNotFound.jsx` | `auth.getCurrentUser` | Unchanged |
| `app-params.js` | Base44 token from URL/localStorage | Base44 path only; Supabase uses session |

**Direct `base44.auth` in `src/`:** Only inside `authClient.js` (Base44 branch). ✅

---

## 2. Implemented public API

| Method | Base44 delegate | Supabase implementation |
|--------|-----------------|-------------------------|
| `login(email, password)` | `loginViaEmailPassword` | `signInWithPassword` + `mergeAppUser` |
| `logout(redirectUrl?)` | `base44.auth.logout` | `signOut` + optional redirect |
| `register({ email, password })` | `base44.auth.register` | `signUp` |
| `resetPassword(email)` | `resetPasswordRequest` | `resetPasswordForEmail` |
| `resetPassword({ resetToken, newPassword })` | `base44.auth.resetPassword` | `verifyOtp(recovery)` + `updateUser` |
| `updatePassword(newPassword)` | `base44.auth.updatePassword` | `updateUser({ password })` |
| `currentUser()` / `getCurrentUser()` | `base44.auth.me` | `getUser` + join `public.user` |
| `currentSession()` | `appParams.token` wrapper | `getSession` |
| `refresh()` | SDK `refresh` if present | `refreshSession` |
| `onAuthStateChange(cb)` | SDK listener | `supabase.auth.onAuthStateChange` |
| `signInWithGoogle(path)` | `loginWithProvider('google')` | `signInWithOAuth({ provider: 'google' })` |
| `signInWithLinkedIn(path)` | `loginWithProvider('linkedin')` | `signInWithOAuth({ provider: 'linkedin_oidc' })` |
| `isAuthenticated()` | `me()` / token check | `getSession` |
| `isAdmin()` | `isAdminSession()` | `app_metadata.role` + session flag |
| `getAccessToken()` | `appParams.token` | `session.access_token` |

### Backward-compatible aliases (unchanged call sites)

`loginWithEmailPassword`, `loginWithProvider`, `verifyOtp`, `setToken`, `resendOtp`, `requestPasswordReset`, `updateUserMetadata`, `redirectToLogin`, `checkAppReady`, `adminLogin`, `isAdminSession`, `clearAdminSession`

---

## 3. Backend split

```
Pages / AuthContext
    └── authClient.js
            ├── isBase44() → base44.auth.* / base44.functions.invoke('adminAuth')
            └── isSupabase() → supabaseAuth.js → getSupabaseClient().auth.*
```

| Check | Result |
|-------|--------|
| Mixed runtime per call | **No** — `isBase44()` gate on every export |
| Supabase path uses Base44 auth | **No** |
| Base44 removed | **No** — fully functional default path |
| `dbClient` / `storageClient` / `aiClient` modified | **No** |

---

## 4. AuthContext changes

| Change | Detail |
|--------|--------|
| Supabase `checkAppState` | `checkAppReady()` static config; `isAuthenticated()` gates `checkUserAuth` |
| Base44 `checkAppState` | Unchanged token-gated flow |
| `onAuthStateChange` listener | Subscribes when `isSupabase()`; syncs user state on session change |
| `checkUserAuth` | Wrapped in `useCallback`; clears `authError` on success |
| Direct Base44 imports | **None** |

---

## 5. Admin authentication

| Aspect | Base44 (unchanged) | Supabase (prepared) |
|--------|-------------------|---------------------|
| Login | `functions.invoke('adminAuth')` | `signInWithPassword` + `app_metadata.role` check |
| Session flag | `bb_admin_authed` in sessionStorage | Same flag set on success |
| Guard | `auth.isAdminSession()` in `AdminLayout` | Same |
| Logout | `auth.clearAdminSession()` | Clears flag + `signOut` on main logout |
| RLS | Not enabled | Not enabled (by scope) |

Admin roles recognized: `admin`, `superadmin`, `systemadmin`, `supportadmin`.

---

## 6. User profile merge (Supabase)

`mergeAppUser()` combines:

- `auth.users` (id, email, `user_metadata`, `app_metadata`)
- `public.user` row (`user_role`, `onboarded`, `profile_id`)

`updateUserMetadata()` writes to both `auth.updateUser({ data })` and `public.user` upsert — preserves `Onboarding.jsx` and `AppLayout.jsx` role-switch behavior.

---

## 7. Files changed

| File | Action |
|------|--------|
| `src/api/supabaseAuth.js` | **Created** — Supabase auth implementation |
| `src/api/authClient.js` | **Expanded** — canonical API + Supabase branch |
| `src/lib/AuthContext.jsx` | **Updated** — Supabase session flow |
| `src/components/layout/AdminLayout.jsx` | **Updated** — `auth.isAdminSession()` / `clearAdminSession()` |

**Not modified:** `dbClient`, `storageClient`, `aiClient`, auth pages (Login, Register, etc.), routing.

---

## 8. Build verification

| Check | Result |
|-------|--------|
| `npm run build` | ✅ Pass |
| ESLint on auth modules | ✅ No issues |
| Broken imports | ✅ None |

---

## Authentication Dependency Report

| Location | `base44.auth` | `authClient` |
|----------|---------------|--------------|
| Pages (`src/pages`) | **0** | 8 files |
| Hooks (`src/hooks`) | **0** | 0 |
| `AuthContext` | **0** | ✅ |
| `ProtectedRoute` | **0** | via `useAuth` |
| `authClient.js` (Base44 branch) | ✅ isolated | — |
| `supabaseAuth.js` | **0** | internal |

---

## OAuth Readiness Report

| Provider | Base44 | Supabase wiring | Dashboard config |
|----------|--------|-----------------|------------------|
| Google | `loginWithProvider('google')` | `signInWithOAuth({ provider: 'google' })` | ⏳ Required at cutover |
| LinkedIn | `loginWithProvider('linkedin')` | `signInWithOAuth({ provider: 'linkedin_oidc' })` | ⏳ Required at cutover |

Redirect URL pattern: `{VITE_APP_URL || origin}{redirectPath}`

No OAuth credentials stored in repository. Abstraction is wired; provider setup is external.

---

## Repository Compatibility Report

| Check | Result |
|-------|--------|
| Pages import `base44.auth` directly | **0** |
| Hooks import `base44.auth` directly | **0** |
| Duplicate auth implementations | **None** — single `authClient` surface |
| Page modifications required | **0** |
| Runtime switch | `VITE_DATA_BACKEND` only |
| Production default | `base44` unchanged |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| `public.user` row missing for Supabase auth user | Medium | Seed in 7.5; `mergeAppUser` falls back to metadata |
| OAuth providers not configured | Medium | Preview testing blocked until Dashboard setup |
| Admin Supabase users need `app_metadata.role` | Medium | Document in 7.5 seed script |
| `bb_admin_authed` session flag (both backends) | Low | Existing behavior preserved |
| Base44 `base44Client` still bundled when supabase | Low | Same as dbClient; defer lazy-load to 7.7 |
| No RLS | High (preview) | Keep prod on `base44` until 7.4.5 |
| LinkedIn provider key `linkedin_oidc` | Low | Verify against Supabase project provider list at cutover |

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Complete auth abstraction | ✅ |
| Base44 fully functional (default) | ✅ |
| Supabase path implemented | ✅ |
| AuthContext uses authClient only | ✅ |
| No page Base44 auth imports | ✅ |
| Admin behavior preserved | ✅ |
| OAuth abstraction wired | ✅ |
| dbClient / storage / AI untouched | ✅ |
| Build passes | ✅ |

**Next:** Phase 7.4C — `storageClient` + `assetPipeline` Supabase implementation.
