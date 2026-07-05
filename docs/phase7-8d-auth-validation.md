# Phase 7.8D — Authentication Production Validation

**Generated:** 2026-07-05  
**Auth implementation:** `src/api/authClient.js` → `src/api/supabaseAuth.js`  
**Admin Edge Function:** `admin-auth` (JWT not required on function; uses service role internally)

## Executive Summary

Authentication paths are structurally complete and were **live-validated in Phase 7.6** on the canonical project. Phase 7.7A hardened admin authorization to `app_metadata.role` only. This session could not re-run live browser tests (no client credentials in shell). Evidence is tiered: **live (7.6)** + **static (7.8)** + **remediation (7.7A)**.

## Role Matrix

| Role | Login path | Role source | Admin detection |
|------|------------|-------------|-----------------|
| Owner / Exhibitor | Email+password | `app_metadata.role` or default `user` + `user_role` in DB | `user.role !== admin` |
| Buyer | Email+password | Same | Same |
| Admin | Email+password or `admin-auth` | **`app_metadata.role = admin`** | `isAdminRole()` / RLS `private.is_admin()` |

## Validation Results

| Flow | Owner | Exhibitor | Buyer | Admin | Evidence |
|------|-------|-----------|-------|-------|----------|
| Login | ✅ | ✅ (same path) | ✅ | ✅ | Phase 7.6 PASS |
| Logout | ✅ | ✅ | ✅ | ✅ | Phase 7.6 PASS |
| Session refresh | ✅ | ✅ | ✅ | ✅ | `refreshSession()` rotated token |
| Password reset | ✅ | ✅ | ✅ | ✅ | Recovery link + re-login |
| OTP verify | ✅ | ✅ | ✅ | — | Email OTP both `signup` and `email` types |
| OAuth initiation (Google) | ⚠️ Partial | ⚠️ | ⚠️ | — | URL generated; callback not browser-tested |
| OAuth initiation (LinkedIn) | ⚠️ Partial | ⚠️ | ⚠️ | — | Same |
| Register (public signUp) | ⚠️ Blocked | ⚠️ | ⚠️ | — | Email rate limit (Phase 7.6) |
| Admin detection | — | — | — | ✅ | JWT `app_metadata.role = admin` |
| JWT claims | ✅ | ✅ | ✅ | ✅ | `sub`, `role`, `app_metadata` verified |
| Session expiration | ✅ (design) | ✅ | ✅ | ✅ | `jwt_expiry = 3600` in config |

## JWT & Claims

| Claim | Used for | Safe? |
|-------|----------|-------|
| `app_metadata.role` | Admin RLS, `isAdminUser()`, UI admin gate | ✅ Server-controlled |
| `user_metadata.*` | Profile hints (`onboarded`, `profile_id`) | ✅ Not used for admin (7.7A) |
| `public.user` row | `mergeAppUser()` enrichment | ✅ RLS-protected |

`supabase/functions/_shared/auth.ts` validates JWT via `service_role` + `auth.getUser(token)` — no custom `JWT_SECRET`.

## Admin Auth Paths

1. **Standard Supabase login** — admin user with `app_metadata.role = admin` → full app + RLS admin policies.
2. **`admin-auth` Edge Function** — `verify_jwt = false`; validates credentials then checks `isAdminUser()`. Optional legacy `ADMIN_EMAIL`/`ADMIN_PASSWORD` env mode (not set on canonical project).

Phase 7.7A removed privilege-escalation via `user_metadata.role`.

## Known Gaps

| Gap | Severity | Mitigation |
|-----|----------|------------|
| Register blocked by email rate limit | Medium | Tune Auth rate limits / SMTP before launch traffic |
| OAuth callback not browser-tested | Medium | One manual pass on production URL before sign-off |
| `mergeAppUser()` not executed in Node harness | Low | Preview smoke after deploy |
| Production SMTP not in repo | Medium | Dashboard: configure SendGrid/Resend/etc. |

## Production Checklist (Auth)

- [ ] Set `VITE_APP_URL=https://boothbridge.app` on host
- [ ] Add production redirect URLs in Supabase Auth dashboard
- [ ] Configure production SMTP for password reset / OTP
- [ ] Confirm Google + LinkedIn OAuth client IDs for production domain
- [ ] Create or verify admin user with `app_metadata.role = admin` (not `user_metadata`)
- [ ] Remove any `VITE_BASE44_*` from production env

## Classification

**Auth: PASS with warnings** — core flows validated live; register/OAuth/SMTP need operator completion before high-traffic launch.
