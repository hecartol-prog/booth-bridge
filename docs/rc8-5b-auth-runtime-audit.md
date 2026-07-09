# RC8.5B — Supabase Authentication Runtime Audit

Date: 2026-07-08

## Evidence Executed

- Runtime E2E harness run: `node scripts/phase7-6-e2e-validation.mjs`
  - output: `C:\Users\hecto\AppData\Local\Temp\rc85-e2e.json`
- Source verification:
  - `src/api/supabaseClient.js`
  - `supabase/config.toml`

## Verification Matrix

| Item | Status | Evidence |
|---|---|---|
| Site URL | **Unknown (production runtime config)** | Local `supabase/config.toml` has local defaults only; production auth config value not directly readable in this session. |
| Redirect URLs | **Unknown (production runtime config)** | Same as above; local config only. |
| Email confirmation | **PASS** | E2E `otp_verification.ok=true`, email verification paths succeeded. |
| Password reset | **PASS** | E2E `password_reset.ok=true`, relogin success true. |
| Session persistence | **PASS** | E2E `session_refresh.ok=true`; app client config has `persistSession: true`, `autoRefreshToken: true`. |
| Cookie configuration | **N/A (SPA token storage path)** | App uses `@supabase/supabase-js` browser client settings; no custom cookie-layer implementation in app runtime. |
| PKCE flow | **PASS** | `src/api/supabaseClient.js` sets `flowType: "pkce"`. |
| Google provider disabled (expected) | **FAIL** | E2E `google_oauth.has_url=true` indicates provider is enabled. |
| LinkedIn provider disabled (expected) | **FAIL** | E2E `linkedin_oauth.has_url=true` indicates provider is enabled. |

## Result

**FAIL**

## Blocking Findings

1. Google provider is enabled while expected state for RC8.5 is disabled.
2. LinkedIn provider is enabled while expected state for RC8.5 is disabled.
3. Production Site URL / Redirect URL values were not directly enumerable from this shell environment.

