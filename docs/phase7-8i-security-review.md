# Phase 7.8I — Security Review

**Generated:** 2026-07-05  
**Scope:** Client exposure, RLS, storage, JWT, admin auth, Edge secrets, Base44 residue

## Executive Summary

No service-role or provider secrets appear in client code. RLS is enabled on all 39 public tables. Admin authorization was hardened in Phase 7.7A to use `app_metadata.role` only. Primary residual risks are **operational** (secret rotation, SMTP, CORS `*`) and one **medium code defect** (notification abstraction).

## Checklist

| Control | Status | Evidence |
|---------|--------|----------|
| Service role not in client | ✅ PASS | Only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `src/` |
| No secrets in client bundle | ✅ PASS | Grep: no `sk-`, `or-`, `SERVICE_ROLE` in `src/` |
| RLS on all public tables | ✅ PASS | Live: 39/39 |
| Storage private buckets | ✅ PASS | All three `public = false` |
| Storage policies match repo | ✅ PASS | 16 policies live |
| JWT validation (Edge) | ✅ PASS | `auth.getUser(token)` via service role |
| Admin authorization | ✅ PASS | `isAdminUser()` — `app_metadata.role` only (7.7A) |
| Edge Function JWT gate | ✅ PASS | `verify_jwt = true` on all AI functions |
| `admin-auth` exposure | ⚠️ WARN | `verify_jwt = false` — mitigated by credential + role check |
| OpenRouter secrets server-only | ✅ PASS | `Deno.env.get` in Edge only |
| Base44 credentials in production env | ⚠️ WARN | Should be removed from host after cutover |
| CORS on Edge | ⚠️ WARN | `Access-Control-Allow-Origin: *` — tighten post-launch |
| `user_metadata` for auth | ✅ FIXED | Removed from admin checks (7.7A) |
| JWT_SECRET custom | N/A | Not used |

## RLS Highlights

- Anonymous: no writes; limited discovery reads
- Owner/participant scoping on sensitive entities
- Admin via `private.is_admin()` reading JWT `app_metadata`
- UPDATE policies paired with SELECT where required (Postgres RLS rule)

## Storage Security

- Private buckets — no public anon access
- Path-based ownership `auth.uid()` in folder segment
- Shared assets via security-definer helpers (`is_shared_media_asset`, `is_shared_catalog_asset`)
- Signed URLs for UI rendering (7.7A)

## Edge Function Authentication

```
Client (anon JWT) → functions.invoke(Authorization: Bearer <user_jwt>)
                 → _shared/auth.ts → getUser(token)
                 → handler executes
```

`admin-auth` is intentionally unauthenticated at gateway level; validates body credentials then checks admin role.

## Secrets Inventory (canonical project)

Present in Edge secrets (hashed in CLI output):

- `OPENAI_API_KEY` — present; **rotate** (invalid per 7.6)
- `OPENROUTER_API_KEY` — **missing**
- Auto-injected: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, JWKS, etc.

**Never** add these to `VITE_*` variables.

## Base44 Residue

| Item | Risk | Action |
|------|------|--------|
| `@base44/sdk` in bundle | Low | Rollback window only |
| `base44/` entity JSONC | None | Reference data |
| `media.base44.com` logo URLs | Low | Cosmetic CDN |
| `README.md` Base44 setup | None | Update docs |

## Open Issues

1. **Notification cross-user create** — functional/security boundary mismatch (medium)
2. **CORS wildcard** — acceptable for MVP; restrict to `boothbridge.app` when stable
3. **Email rate limits** — can block signup (availability, not confidentiality)

## Classification

**Security: PASS** — no critical exposure findings; operational hardening recommended.
