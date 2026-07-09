# RC8.5A — Production Environment Audit

Date: 2026-07-08  
Scope: Production readiness env verification only.

## Evidence Executed

- `curl.exe -s -o NUL -w "prod_status=%{http_code} time=%{time_total}\n" https://www.boothbridge.app/`
- `supabase projects list`
- `supabase secrets list --project-ref jjqhmvfzqpohvukoxeoe`
- `env.example` and runtime code checks (`src/config/backend.js`)

## Variable Audit

| Variable | Status | Evidence |
|---|---|---|
| `VITE_SUPABASE_URL` | **Unknown in Vercel env** / **Required by runtime** | Frontend runtime enforces presence (`isSupabaseConfigured`); direct Vercel env listing unavailable in this shell. |
| `VITE_SUPABASE_ANON_KEY` | **Unknown in Vercel env** / **Required by runtime** | Same as above; production host responds `200` but exact env value cannot be read here. |
| `VITE_APP_URL` | **Unknown in Vercel env** / **Recommended** | Not directly inspectable without Vercel CLI/API credentials. |
| `VITE_AI_ENABLED` | **Unknown in Vercel env** / optional toggle | Runtime defaults AI on when not `"false"`. |
| `VITE_BASE44_*` | **Not found in runtime code path** | RC8 removed `VITE_DATA_BACKEND` and Base44 runtime branching. |
| `BASE44_*` | **Not found in package/runtime dependencies** | No `@base44/*` dependencies in `package.json`/`package-lock.json`. |

## Supabase Secret Inventory (Project-level)

`supabase secrets list` confirms project has:

- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- related Supabase managed keys

This confirms backend secret material exists, but does **not** prove Vercel `VITE_*` deployment envs.

## Result

**PASS WITH WARNINGS**

### Warnings

1. Production deployment env (`VITE_*`) values could not be listed because `vercel`/`gh` CLIs are unavailable in this environment.
2. Exact `VITE_AI_ENABLED` value on production could not be directly inspected.

