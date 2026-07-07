# RC5-1 — Vercel Deployment Verification

**Generated:** 2026-07-06  
**Branch:** `migration/base44-independence`  
**Commit:** `4ab9e7115a4c63a5b60f0292d93e13bdae8d4f47` — *RC4: Production hardening for lint, typecheck, security, and AI gateway.*  
**Validator:** RC5 release engineering session (evidence-only)

---

## Executive Summary

| Check | Result |
|-------|--------|
| Vercel production deployment | **NOT VERIFIED — NOT DEPLOYED** |
| Application live on Vercel | **NO** |
| Local production build | **PASS** |

The BoothBridge React application has **not** been deployed to Vercel. The production domain `boothbridge.app` currently serves a **Hostinger default placeholder page**, not a Vercel deployment. No Vercel project linkage exists in this repository or local environment.

---

## Verification Matrix

| Item | Expected | Observed | Status |
|------|----------|----------|--------|
| Production branch | `migration/base44-independence` (or agreed prod branch) | Git branch = `migration/base44-independence` | **PASS** (repo) |
| Production build | `npm run build` exit 0 | Exit 0 (2026-07-06 session) | **PASS** |
| Lint | exit 0 | exit 0 | **PASS** |
| Typecheck | exit 0 | exit 0 | **PASS** |
| Vercel project linked | `.vercel/project.json` or Dashboard link | No `.vercel/` directory in repo | **FAIL** |
| Vercel CLI | `vercel --version` | Command not found on validator host | **NOT VERIFIED** |
| GitHub → Vercel integration | Auto-deploy on push | No `.github/workflows/*` in repo | **NOT CONFIGURED** |
| Production deployment URL | `*.vercel.app` or custom domain | No Vercel hostname discovered | **FAIL** |
| Environment variables on Vercel | `VITE_SUPABASE_*`, etc. | No Vercel project access | **NOT VERIFIED** |
| Framework detection | Vite | N/A — no deployment | **NOT VERIFIED** |
| SPA routing (`vercel.json`) | `/*` → `/index.html` | No `vercel.json` in repository | **NOT CONFIGURED** |
| Build logs | Vercel Dashboard | No deployment exists | **NOT VERIFIED** |
| Static assets served | `/assets/*.js`, `/assets/*.css` | Not on production domain | **FAIL** |
| Service Worker (`/sw.js`) | Registered in production builds | Hostinger returns 404 for `/sw.js` | **FAIL** |
| Cache headers | Vercel CDN defaults | Hostinger `LiteSpeed` — not app assets | **NOT VERIFIED** |

---

## Local Build Evidence

Commands run 2026-07-06 from repository root:

```text
npm run lint    → exit 0
npm run typecheck → exit 0
npm run build   → exit 0
```

Build output (`dist/`):

| Asset | Size (bytes) |
|-------|-------------|
| `dist/assets/index-z0V-zYqZ.js` | 1,640,646 (~1.56 MiB) |
| `dist/assets/index-B3J9BANq.css` | 90,138 (~88 KiB) |
| `dist/index.html` | 1,834 |
| `dist/sw.js` | 1,404 |

Service worker registration is implemented in `src/main.jsx` (production only). The built `sw.js` is copied from `public/sw.js`.

---

## Production Domain Probe (cross-check)

```text
curl -sI https://boothbridge.app
→ HTTP/1.1 200 OK
→ Server: LiteSpeed
→ platform: hostinger
→ X-Powered-By: PHP/8.3.30
```

Response body begins with Hostinger *"Default page"* HTML — **not** the Vite/React application.

```text
curl -sI https://boothbridge.app/sw.js
→ HTTP/1.1 404 Not Found
→ Server: LiteSpeed (Hostinger)
```

```text
curl -sI https://boothbridge.app/dashboard
→ HTTP/1.1 404 Not Found
```

**Conclusion:** Production DNS does not point to Vercel. SPA routing cannot be validated until DNS and Vercel deployment are completed.

---

## Repository Configuration Gaps

| Gap | Impact |
|-----|--------|
| No `vercel.json` | React Router client-side routes will 404 on direct navigation without SPA rewrites |
| No `.env.example` / documented Vercel env set in repo | Operator must manually configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL` |
| No CI/CD workflow | Deploy is manual unless Vercel Git integration is configured in Dashboard (not visible from repo) |

Recommended `vercel.json` (not added in RC5 — deploy prerequisite only):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Required Vercel Environment Variables (Production)

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | **Yes** | `https://jjqhmvfzqpohvukoxeoe.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Publishable anon key (prefix `kwOGo` on canonical project) |
| `VITE_APP_URL` | Recommended | `https://boothbridge.app` |
| `VITE_DATA_BACKEND` | Optional | Omit or `supabase` (RC3 default) |
| `VITE_AI_ENABLED` | Optional | `false` for staged AI cutover |
| `VITE_BASE44_*` | **Remove** | Rollback only — not for production |

---

## Why Deployment Was Not Executed

| Blocker | Detail |
|---------|--------|
| Vercel CLI absent | `vercel` not installed on validator host |
| No Vercel auth token | Cannot run `vercel deploy --prod` |
| No GitHub `gh` CLI | Cannot inspect Vercel integration via `gh` |
| DNS not pointed to Vercel | Even if deployed to `*.vercel.app`, custom domain cutover requires Hostinger DNS change |

---

## How to Verify (Operator Checklist)

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link` from repo root (select `hecartol-prog/booth-bridge`)
3. Set Production environment variables in Vercel Dashboard → Settings → Environment Variables
4. Add `vercel.json` SPA rewrites (see above)
5. Deploy: `vercel deploy --prod`
6. Confirm build logs show Vite framework detection and successful `vite build`
7. Open deployment URL → Network tab shows `index-*.js` (~1.64 MB), not Hostinger default page
8. Confirm `/sw.js` returns 200 with `Content-Type: application/javascript`
9. Navigate directly to `/login` — should load SPA (not 404)

---

## Verdict

**FAIL — Vercel production deployment has not occurred.**

Deploy BoothBridge to Vercel and re-run RC5-1 before any production launch sign-off.
