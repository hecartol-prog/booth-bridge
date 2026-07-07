# RC5-5 — Authentication Production Validation

**Generated:** 2026-07-06  
**Auth provider:** Supabase Auth (`jjqhmvfzqpohvukoxeoe`)  
**Production URL:** `https://boothbridge.app` (app **not deployed** — tests against Supabase API + prior Phase 7 reports)

---

## Executive Summary

| Flow | Production RC5 | Notes |
|------|----------------|-------|
| Email login | **NOT VERIFIED** | No live app on domain |
| Registration | **NOT VERIFIED** | Prior: email rate limit hit in Phase 7.6 |
| Password reset | **NOT VERIFIED** | |
| Magic link | **NOT VERIFIED** | |
| Email verification | **NOT VERIFIED** | |
| SMTP | **NOT VERIFIED** | Dashboard access required |
| Google OAuth | **NOT VERIFIED** | |
| LinkedIn OAuth | **NOT VERIFIED** | |
| Session refresh | **NOT VERIFIED** on production URL | Code path exists |
| JWT expiration | **NOT VERIFIED** live | Platform-managed |
| Logout | **NOT VERIFIED** on production URL | Code path exists |
| Auth API health | **PASS** | `/auth/v1/health` reachable |

---

## Platform Reachability

```text
GET https://jjqhmvfzqpohvukoxeoe.supabase.co/auth/v1/health
→ Reachable (RTT ~1.19s from validator, 2026-07-06)
```

Supabase Auth service is **online** on the canonical project.

---

## Redirect URL Configuration

| Expected (production checklist) | RC5 status |
|--------------------------------|------------|
| `https://boothbridge.app/**` | **NOT VERIFIED** — Dashboard access required |
| Site URL = `https://boothbridge.app` | **NOT VERIFIED** |

**Risk:** Until Vercel deploy + Dashboard update, OAuth and email links may still point to localhost, preview URLs, or legacy Base44 domains.

---

## SMTP

| Item | RC5 status |
|------|------------|
| Custom SMTP configured | **NOT VERIFIED** |
| Supabase built-in email | **NOT VERIFIED** |
| Email deliverability | **NOT VERIFIED** |

Phase 7.8D documented SMTP as **pending** for production. No RC5 evidence of configuration change.

---

## OAuth Providers

| Provider | Code support | Production RC5 |
|----------|--------------|----------------|
| Google | `src/api/supabaseAuth.js` | **NOT VERIFIED** — callback not tested on `boothbridge.app` |
| LinkedIn | `src/api/supabaseAuth.js` | **NOT VERIFIED** |

Prior Phase 7.6: OAuth **initiation URLs** generated successfully; **callback completion** not exercised in CLI-only validation.

---

## Session & JWT

| Check | Evidence | RC5 |
|-------|----------|-----|
| JWT signing | Supabase-managed (`SUPABASE_JWKS` on Edge) | **PASS** (architecture) |
| Edge `validateJwt()` | `supabase/functions/_shared/auth.ts` | Code **PASS** |
| Invalid JWT on REST | `PGRST301` / HTTP 401 | **PASS** (live curl) |
| Anon JWT on `ai-health` | `missing sub claim` / HTTP 401 | **PASS** (correct rejection) |
| Session refresh in browser | `supabaseAuth.refreshSession()` | **NOT VERIFIED** on production |

---

## Admin Authentication

| Path | Edge Function | verify_jwt |
|------|---------------|------------|
| `/admin-login` page | `admin-auth` | `false` |

**Live admin login on production:** **NOT VERIFIED** (no deployed frontend).

Admin role model: `app_metadata.role = admin` (per production checklist).

---

## Prior Validation Reference (Phase 7.6 / 7.8D)

| Test | Historical result |
|------|-------------------|
| `signUp()` email/password | **Partial** — rate limit exceeded after repeated tests |
| `signInWithPassword()` | **PASS** (test users) |
| Password reset email trigger | **PASS** (API accepted) |
| Google OAuth URL generation | **PASS** |
| LinkedIn OAuth URL generation | **PASS** |
| `mergeAppUser()` browser path | **NOT VERIFIED** |

These results are **not re-run** in RC5. Treat as **stale** until re-validated post-deploy.

---

## Production Blockers

1. **Frontend not deployed** — cannot walk login/register UI on `boothbridge.app`
2. **SMTP/OAuth Dashboard config unverified**
3. **Redirect URLs** must include production domain before OAuth cutover
4. **Email rate limits** — review before pilot signup volume

---

## How to Verify (Operator Checklist)

### Supabase Dashboard → Authentication

1. **URL Configuration:** Site URL = `https://boothbridge.app`
2. **Redirect URLs:** add `https://boothbridge.app/**`
3. **SMTP:** configure custom SMTP or confirm built-in limits acceptable
4. **Providers:** enable Google + LinkedIn with production client IDs/secrets
5. **Email templates:** verify reset, confirm, magic link templates

### Browser smoke (three roles)

| Role | Steps |
|------|-------|
| Visitor/Buyer | Register → verify email → login → logout |
| Exhibitor | Login → complete profile |
| Admin | `/admin-login` → dashboard |

Record PASS/FAIL per step. Capture screenshots of email receipt and OAuth callback URL bar.

---

## Verdict

**FAIL — Production authentication flows cannot be validated until the app is deployed and Supabase Auth production settings (SMTP, OAuth, redirect URLs) are confirmed in Dashboard.**

Auth **API is reachable**; end-user **flows are unproven** on the live domain.
