# Phase 9.4 — Security Audit

**Generated:** 2026-07-05  
**Scope:** JWT, RLS, Storage, Admin, Edge Functions, AI Gateway, Environment, Secrets  
**Prior baseline:** Phase 7.8I  
**Architecture changes:** None (audit only)

---

## Executive Summary

Security posture inherited from Phase 7 migration is **production-grade for MVP**. No service-role or AI provider secrets appear in client code. RLS covers all 39 public tables. Admin authorization uses server-controlled `app_metadata.role` only. Residual risks are **operational** (secret rotation, SMTP, CORS hardening, production env hygiene) and one **medium functional defect** (notification cross-user create).

### Classification: **GO WITH WARNINGS**

No STOP-level security findings. Complete P1 operational items before high-traffic pilot.

---

## 1. JWT & Session Security

| Control | Status | Evidence |
|---------|--------|----------|
| Custom `JWT_SECRET` in app | N/A | Not used — Supabase-managed signing |
| Edge JWT validation | ✅ PASS | `_shared/auth.ts` → `auth.getUser(token)` |
| Client session storage | ✅ PASS | Supabase JS PKCE/cookie patterns |
| JWT expiry | ✅ 3600s | `config.toml` |
| Refresh token rotation | ✅ Enabled | `enable_refresh_token_rotation = true` |
| `user_metadata` for authorization | ✅ FIXED | Removed from admin checks (7.7A) |
| `app_metadata.role` for admin | ✅ PASS | RLS `private.is_admin()` |
| Token invalidation on user delete | ⚠️ WARN | Supabase default — sessions persist until expiry |

### JWT flow

```
Browser (anon key + user JWT)
  → PostgREST / Storage / Realtime (RLS enforced)
  → Edge Functions (verify_jwt=true → auth.getUser)
```

**Recommendation:** Keep JWT expiry at 1h for pilot; consider shorter for admin-only operations post-launch.

---

## 2. Row Level Security (RLS)

| Check | Result |
|-------|--------|
| Public tables with RLS ON | 39/39 ✅ |
| Policy count | 94 ✅ |
| Anonymous write policies | None ✅ |
| Admin policies | `*_admin_all` via `is_admin()` ✅ |
| UPDATE + SELECT pairing | Reviewed in 7.5B ✅ |
| Security definer helpers | In `private` schema ✅ |
| Views bypass RLS | No exposed unsafe views identified |

### Known RLS-adjacent defect

**Cross-user notification create (Medium):** Application layer uses `.insert().select().single()` but recipient-only SELECT policy blocks return row for cross-user sends. Data may insert but client receives error — inconsistent UX, not privilege escalation.

**Fix (post-pilot, minimal):** Use service-role Edge helper or adjust insert return pattern — do not weaken recipient SELECT policy.

---

## 3. Storage Security

| Control | Status |
|---------|--------|
| All buckets private | ✅ |
| Path ownership (`auth.uid()` in path) | ✅ |
| Cross-user access blocked | ✅ Live 7.6 |
| Signed URLs for UI | ✅ 7.7A |
| Shared asset helpers | ✅ Security definer |
| Admin storage override | ✅ Scoped admin policies |
| Service role in browser | ✅ Not present |

### Storage upsert note

Upsert requires INSERT + SELECT + UPDATE policies — all three granted per bucket in `094_storage_policies.sql` ✅.

---

## 4. Admin Security

| Path | JWT gate | Authorization | Status |
|------|----------|---------------|--------|
| Standard login + admin role | User JWT | `app_metadata.role = admin` | ✅ |
| `admin-auth` Edge Function | `verify_jwt = false` | Credential check + `isAdminUser()` | ⚠️ Acceptable |
| Admin UI routes | Client-side | Role check + RLS backend | ✅ |
| Impersonation | `bb_impersonate_as_user` localStorage | Admin-only feature | ⚠️ Audit in prod |

**`admin-auth` exposure:** Gateway does not require JWT; function validates credentials internally. Acceptable for MVP if rate-limited and monitored. Consider IP allow-list for admin login at scale.

---

## 5. Edge Functions

| Function | verify_jwt | Risk |
|----------|------------|------|
| All `ai-*` (9) | true | ✅ |
| `admin-auth` | false | ⚠️ Mitigated |

### CORS

`Access-Control-Allow-Origin: *` in `_shared/cors.ts` — **acceptable for MVP**, tighten to `https://boothbridge.app` after stable production URL.

### Input validation

AI handlers use structured envelopes (`_shared/envelope.ts`). No raw SQL from client input in Edge functions reviewed.

---

## 6. AI Gateway Security

| Control | Status |
|---------|--------|
| Provider keys server-only | ✅ `Deno.env.get` |
| No keys in `src/` | ✅ Grep clean |
| JWT required on AI routes | ✅ |
| OpenRouter referer header | `https://boothbridge.app` default |
| Client prompt injection surface | User content sent to models — standard LLM risk |
| `VITE_AI_ENABLED=false` kill switch | ✅ |

**Operational:** Rotate invalid `OPENAI_API_KEY`; set `OPENROUTER_API_KEY`. Keys in Edge secrets only — never `VITE_*`.

---

## 7. Environment & Secrets

### Client-exposed (safe)

| Variable | Exposure | Safe? |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | Browser | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Browser | ✅ (RLS-protected) |
| `VITE_APP_URL` | Browser | ✅ |

### Server-only (must never be client)

| Variable | Location | Status |
|----------|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge auto-inject | ✅ Not in client |
| `OPENROUTER_API_KEY` | Edge secrets | ⚠️ Missing |
| `OPENAI_API_KEY` | Edge secrets | ⚠️ Invalid — rotate |

### Obsolete / rollback

| Variable | Production action |
|----------|-------------------|
| `VITE_BASE44_*` | Remove after 48h window |
| `BASE44_*` scripts | Migration tooling only |

### Repository hygiene

| Item | Status |
|------|--------|
| `.env` in `.gitignore` | ✅ Expected |
| `.env.example` tracked | ❌ Missing — add in Phase 9.7 |
| Secrets in git history | Not audited this session |

---

## 8. Supabase Security Advisors

Supabase MCP `get_advisors` returned permission error this session. **Operator action:** Run Dashboard → Advisors → Security after deploy.

Expected checks from Phase 7.5B baseline:

- RLS enabled on all public tables ✅
- No public storage buckets ✅
- Review any new extensions or functions post-migration

---

## 9. Threat Summary

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Anon key abuse (scraping) | Medium | Low | RLS limits data exposure |
| Stolen user JWT | Low | Medium | Short expiry, HTTPS only |
| Service role leak | Low | Critical | Never in client; audit deploy env |
| AI key leak | Medium if unset | Medium | Set + rotate; monitor Edge logs |
| OAuth redirect hijack | Low | Medium | Exact redirect URL allow-list |
| CORS abuse | Low | Low | Tighten post-MVP |
| Signup spam / rate limit | Medium | Medium | SMTP + rate limit tuning |
| Exhibition Wi‑Fi MITM | Medium | Medium | HTTPS enforced; no sensitive data in URLs |

---

## 10. Required Actions Before Pilot

### P0

1. Confirm no `SUPABASE_SERVICE_ROLE_KEY` in Vercel/host env (client)
2. Set production Auth redirect URLs (no wildcard over HTTP)
3. Verify admin users have `app_metadata.role = admin` only

### P1

4. Rotate `OPENAI_API_KEY`; set `OPENROUTER_API_KEY`
5. Configure production SMTP (password reset, OTP)
6. Tighten Edge CORS to production origin
7. Enable Supabase Auth rate limit review for event day

### P2

8. Fix notification cross-user abstraction
9. Add Sentry/Datadog for client error tracking
10. Document incident response (Phase 9.5)

---

## Review

Security architecture is sound for MVP pilot. No architectural changes required. Focus on **secret hygiene, Auth production config, and monitoring**.

---

## Prompt for Next Phase

**Phase 9.5 — Pilot Readiness**

Evaluate operational readiness for a live exhibition: support, offline behavior, recovery, monitoring, logging, incident response, and pilot-day checklist.

---

## Commands Before Phase 9.5

```powershell
# Verify no secrets in built client bundle
Select-String -Path "dist/assets/*.js" -Pattern "service_role|sk-|or-" -SimpleMatch
# Expected: no matches

# Supabase Dashboard checks (operator)
# Auth → URL Configuration → Site URL + Redirect URLs
# Settings → Database → Backups
# Edge Functions → Logs
```

---

## Classification

| Area | Status |
|------|--------|
| JWT / Auth design | ✅ GO |
| RLS / Storage | ✅ GO |
| Edge / AI secrets | ⚠️ WARNINGS |
| Admin / CORS | ⚠️ WARNINGS |
| **Overall Phase 9.4** | **GO WITH WARNINGS** |
