# RC5 — Final Production Launch Report

**Generated:** 2026-07-06  
**Release:** RC5 — Production Deployment & Live Validation  
**Branch:** `migration/base44-independence`  
**Git commit:** `4ab9e7115a4c63a5b60f0292d93e13bdae8d4f47`  
**Commit message:** RC4: Production hardening for lint, typecheck, security, and AI gateway.

---

## Final Decision

# NO GO

Production deployment and live validation are **incomplete**. The engineering migration (code, migrations, Edge Functions) is ready; **operational cutover has not occurred**.

---

## Production Snapshot

| Item | Value |
|------|-------|
| **Production URL** | `https://boothbridge.app` — serves **Hostinger default page**, not BoothBridge |
| **Current version** | `0.0.0` (`package.json`) — no `v1.0.0-rc5` tag |
| **Git commit** | `4ab9e7115a4c63a5b60f0292d93e13bdae8d4f47` |
| **Supabase project** | `jjqhmvfzqpohvukoxeoe` (Booth Bridge App, `ap-northeast-1`, `ACTIVE_HEALTHY`) |
| **Vercel deployment** | **None verified** — no CLI, no `.vercel/`, domain not on Vercel |
| **Hostinger DNS** | Apex → `82.197.83.245` (Hostinger); `www` → legacy Render/Base44 chain |
| **SSL** | HTTPS works on both apex and `www`; certificate details not audited |
| **SMTP** | **NOT VERIFIED** |
| **OAuth** | **NOT VERIFIED** on production domain |
| **Storage** | Migrations applied; live smoke **NOT RE-RUN** (Phase 7.6: PASS) |
| **Realtime** | Publication configured; live smoke **NOT RE-RUN** (Phase 7.8F: PASS) |
| **AI** | **`OPENROUTER_API_KEY` absent**; live completions **NOT VERIFIED** |

---

## RC5 Report Index

| Report | Verdict |
|--------|---------|
| [RC5-1 Vercel](./rc5-1-vercel-deployment.md) | **FAIL** — not deployed |
| [RC5-2 Domain](./rc5-2-domain-configuration.md) | **FAIL** — DNS not pointed to Vercel |
| [RC5-3 Supabase](./rc5-3-supabase-production.md) | **PASS** with warnings |
| [RC5-4 AI](./rc5-4-ai-production.md) | **FAIL** — missing OpenRouter key |
| [RC5-5 Auth](./rc5-5-auth-production.md) | **FAIL** — not testable on prod URL |
| [RC5-6 Storage](./rc5-6-storage-production.md) | **NOT VERIFIED** (stale Phase 7.6 PASS) |
| [RC5-7 Realtime](./rc5-7-realtime-production.md) | **NOT VERIFIED** live |
| [RC5-8 Smoke](./rc5-8-end-to-end-smoke.md) | **FAIL** — no app on domain |
| [RC5-9 Security](./rc5-9-security-validation.md) | **PARTIAL PASS** |
| [RC5-10 Performance](./rc5-10-performance-validation.md) | **INCOMPLETE** |

---

## Build Quality (RC4 — verified RC5)

| Command | Result |
|---------|--------|
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |

---

## Smoke Test Summary

| User | Steps executed | Pass | Fail | Blocked |
|------|----------------|------|------|---------|
| Visitor | 0 / 8 | 0 | 0 | 8 |
| Exhibitor | 0 / 11 | 0 | 0 | 11 |
| Admin | 0 / 5 | 0 | 0 | 5 |

**Blocker:** Frontend not live on `boothbridge.app`.

---

## Known Issues

| ID | Severity | Issue |
|----|----------|-------|
| P0-1 | Critical | No Vercel production deployment |
| P0-2 | Critical | DNS apex on Hostinger placeholder, not Vercel |
| P0-3 | Critical | `www` CNAME still chains to legacy `base44.onrender.com` |
| P0-4 | Critical | `OPENROUTER_API_KEY` not set on Supabase |
| P0-5 | Critical | `VITE_SUPABASE_*` not on production host (no host) |
| P1-1 | High | No `vercel.json` SPA rewrites in repo |
| P1-2 | High | SMTP / OAuth production config unverified |
| P1-3 | High | `OPENAI_API_KEY` validity not re-confirmed (Phase 7.6: invalid) |
| P2-1 | Medium | Notification cross-user creation defect (Phase 7.6) |
| P2-2 | Medium | Stray Supabase project `ebaquannrgbgjihbjfdc` with empty DB |
| P2-3 | Low | CORS `*` on Edge Functions |
| P2-4 | Low | Single 1.64 MB JS bundle — no route splitting |

---

## Rollback Procedure

### If Vercel deploy fails or breaks production

1. **DNS rollback:** Restore Hostinger A record to previous value (document current: `82.197.83.245`)
2. **Vercel rollback:** Vercel Dashboard → Deployments → Promote previous deployment
3. **Backend rollback (emergency):** Set `VITE_DATA_BACKEND=base44` on host + restore `VITE_BASE44_*` vars; rebuild. Tag `boothbridge-base44-final` documents last Base44 snapshot.
4. **Supabase:** Do **not** roll back migrations without DBA review. Data plane is forward-only.
5. **Window:** Keep Base44 rollback env documented for 48h after successful Supabase cutover (per Phase 7.7 plan).

### Contact / ownership

| Role | Action |
|------|--------|
| Engineering | Vercel deploy, env vars, smoke tests |
| Operator | Hostinger DNS, Supabase Dashboard secrets, SMTP |
| Product | Go/No-Go after P0 cleared |

---

## Confidence Scores

| Dimension | % | Rationale |
|-----------|---|-----------|
| **Deployment confidence** | **35%** | Backend ready; frontend/DNS/AI secrets not cut over |
| **Pilot readiness** | **40%** | Core code proven in Phase 7.6 harness; prod URL unusable |
| **Commercial readiness** | **25%** | No live product, AI blocked, payments not integrated (Phase 9.6) |

Scores assume P0 items **not** completed. After successful deploy + smoke, revisit:

- Deployment: target **85%**
- Pilot: target **75%**
- Commercial: target **45%** (payments still out of scope)

---

## P0 Launch Checklist (must complete before re-assessment)

1. ☐ Create/link Vercel project for `hecartol-prog/booth-bridge`
2. ☐ Add `vercel.json` SPA rewrites
3. ☐ Set production env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL=https://boothbridge.app`
4. ☐ `vercel deploy --prod`
5. ☐ Update Hostinger DNS: apex → Vercel; `www` → `cname.vercel-dns.com`
6. ☐ Remove stale `www` → Render CNAME
7. ☐ Supabase Auth: Site URL + redirect URLs for `boothbridge.app`
8. ☐ `supabase secrets set OPENROUTER_API_KEY=...`
9. ☐ Rotate valid `OPENAI_API_KEY` (fallback)
10. ☐ Configure SMTP + OAuth providers
11. ☐ Run `node scripts/phase7-6-e2e-validation.mjs`
12. ☐ Execute RC5-8 three-user browser smoke on live URL
13. ☐ Re-run RC5-9 and RC5-10 on production

---

## Decision Matrix

| Decision | Criteria met? |
|----------|---------------|
| **GO** | ❌ |
| **GO WITH WARNINGS** | ❌ — P0 blockers exceed warning threshold |
| **NO GO** | ✅ — **selected** |

---

## Sign-off

| Role | RC5 status |
|------|------------|
| Engineering (build) | RC4 gates **PASS** |
| DevOps (deploy) | **NOT COMPLETE** |
| Security (live) | **PARTIAL** |
| Product launch | **NO GO** |

**Next action:** Execute P0 checklist above, then re-run RC5 validation suite and update this document to GO or GO WITH WARNINGS.

---

*Evidence-only report. No deployment results fabricated. Items marked NOT VERIFIED require operator access documented in sub-reports.*
