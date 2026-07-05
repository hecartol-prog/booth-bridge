# Phase 7.8 — Production Deployment Checklist

**Generated:** 2026-07-05  
**Target:** First production deployment on Supabase (`jjqhmvfzqpohvukoxeoe`)  
**Runtime default:** `VITE_DATA_BACKEND=supabase`

---

## Pre-Deploy

### Infrastructure
- [x] Canonical project linked (`jjqhmvfzqpohvukoxeoe`)
- [x] All 47 migrations applied (`supabase db push --dry-run` clean)
- [x] 39/39 tables RLS enabled
- [x] 3 storage buckets private
- [x] Realtime: `connection`, `meeting` published
- [x] 10 Edge Functions ACTIVE (v2)

### Secrets — Supabase Edge (Dashboard / CLI)
- [ ] Set `OPENROUTER_API_KEY` (**blocking for AI**)
- [ ] Rotate `OPENAI_API_KEY` (valid fallback)
- [ ] Confirm `AI_PROVIDER=openrouter` (optional explicit set)
- [x] `SUPABASE_SERVICE_ROLE_KEY` auto-injected
- [x] `SUPABASE_URL` auto-injected
- [ ] Optional: `ADMIN_EMAIL` / `ADMIN_PASSWORD` only if using env-credential admin mode

### Secrets — Client Host (Vercel / equivalent)
- [ ] `VITE_SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY=<publishable anon key>`
- [ ] `VITE_APP_URL=https://boothbridge.app`
- [ ] `VITE_DATA_BACKEND=supabase` or **omit** (RC3 default)
- [ ] Remove `VITE_BASE44_*` from production
- [ ] Optional: `VITE_AI_ENABLED=false` for staged AI cutover

### Storage
- [x] Buckets exist and match repo
- [x] Policies applied (16)
- [ ] Smoke: upload + signed URL on preview

### Realtime
- [x] Publication configured
- [ ] Smoke: connection/meeting update on preview

### Authentication
- [ ] Production SMTP configured in Supabase Auth
- [ ] Redirect URLs: `https://boothbridge.app/**`
- [ ] Google OAuth production client
- [ ] LinkedIn OAuth production client
- [ ] Admin user: `app_metadata.role = admin`
- [ ] Review email rate limits for signup

### AI
- [ ] `OPENROUTER_API_KEY` set and `ai-health` ping returns `ok`
- [ ] Smoke: `ai-chat`, `ai-document`, `ai-business-card`
- [ ] Confirm `VITE_AI_ENABLED` intent

### Monitoring
- [ ] Enable Supabase Dashboard alerts (DB, Auth, Edge errors)
- [ ] Vercel deployment notifications
- [ ] Optional: Datadog / Sentry for frontend

### Logging
- [ ] Edge Function logs accessible in Dashboard
- [ ] Structured AI gateway logs (`ai_gateway` scope) reviewed after first traffic

### Backups
- [ ] Confirm Supabase plan includes daily backups / PITR
- [ ] Document restore procedure

### Rollback
- [x] `VITE_DATA_BACKEND=base44` build verified
- [ ] Document rollback owner and 48h window
- [ ] Previous Base44 deployment ID noted in runbook

---

## Deployment Order

> **Gate:** Complete [Phase 8.5 — Repository Cleanup & RC1](./checkpoints/phase8-5-rc1-checkpoint.md) and tag `v1.0.0-rc1` before steps 8–10 (production deploy). Preview steps 1–7 may run earlier.

0. **Phase 8.5** — cleanup repo, verify reproducible build, tag `v1.0.0-rc1`
1. **Rotate Edge secrets** (`OPENROUTER_API_KEY`, valid `OPENAI_API_KEY`)
2. **Verify AI** — `ai-health` with `{ "ping": true }`
3. **Configure Auth** — SMTP, OAuth, redirect URLs
4. **Set client env** on host (Supabase URL + anon key)
5. **Deploy preview** with Supabase default
6. **Run smoke harness** — `node scripts/phase7-6-e2e-validation.mjs`
7. **Browser pass** — login, exhibitor upload, buyer meeting, admin panel
8. **Deploy production**
9. **Post-deploy verification** (below)
10. **Monitor 48h** — keep Base44 rollback ready

---

## Post-Deployment Verification

- [ ] App loads without `getSupabaseClient()` throw
- [ ] Exhibitor login → booth → media upload → signed URL renders
- [ ] Buyer login → search → save booth → meeting request
- [ ] Admin login → exhibitor list → media view
- [ ] Realtime: meeting status update visible to both parties
- [ ] AI: OCR scan returns structured result
- [ ] No service-role key in browser network tab
- [ ] Edge errors < threshold in first hour

---

## Sign-Off Roles

| Role | Responsibility |
|------|----------------|
| Engineering | Builds, env, smoke tests |
| Operator | Supabase Dashboard, secrets, SMTP |
| Product | Accept GO / GO WITH WARNINGS / STOP |
