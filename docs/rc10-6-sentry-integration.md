# RC10.6 — Sentry Integration

**Generated:** 2026-07-10  
**Scope:** Production monitoring for BoothBridge (React + Vite + Supabase + Edge Functions)

---

## Architecture

```
Browser (React)
  ├─ src/monitoring/sentryInit.js        → Sentry.init (DSN-gated)
  ├─ SentryErrorBoundary                 → React render errors
  ├─ SentryRouteTracker                  → route tags + breadcrumbs
  ├─ SentryUserBridge                   → Supabase user context (no secrets)
  ├─ monitoringBridge.js                → debug events → Sentry
  ├─ authClient.js                      → auth failures + breadcrumbs
  ├─ supabaseStorage.js                 → storage/session failures
  └─ supabaseEntity.js                  → realtime connection breadcrumbs

Supabase Edge Functions
  └─ _shared/sentry.ts                   → optional DSN reporting (AI handler)
```

Sentry is **disabled by default**. It initializes only when `VITE_SENTRY_DSN` is set at build/runtime.

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SENTRY_DSN` | Vercel / `.env.local` | Enables browser SDK |
| `VITE_SENTRY_ENVIRONMENT` | Vercel | `development` / `preview` / `production` |
| `VITE_SENTRY_RELEASE` | Optional override | Defaults to `booth-bridge@{version}+{git}` |
| `SENTRY_AUTH_TOKEN` | CI only | Upload source maps during `npm run build` |
| `SENTRY_ORG` | CI only | Sentry org slug |
| `SENTRY_PROJECT` | CI only | Sentry project slug |
| `SENTRY_DSN` | Supabase Edge secrets | Optional edge function reporting |

---

## Release Tracking

Each event includes:

- **Release:** `booth-bridge@{package.version}+{git short SHA}` (or `VITE_SENTRY_RELEASE`)
- **Environment:** `VITE_SENTRY_ENVIRONMENT` → else `development` / `preview` / `production`
- **Tags:** `route`, `browser`, `os`, `device`, `subsystem`, `error_category`
- **Build info:** embedded via `__BB_BUILD_INFO__` at compile time

---

## User Context

When authenticated via Supabase:

| Field | Sent to Sentry |
|-------|----------------|
| User ID | Yes |
| Email | Yes |
| Role / user_role | Yes (context) |
| Company ID | Yes (from profile/metadata when present) |
| Event ID | Yes (from metadata when present) |
| Password | **Never** |
| JWT / refresh token | **Never** |
| API keys / secrets | **Never** (scrubbed in `beforeSend`) |

---

## Breadcrumbs

| Event | Source |
|-------|--------|
| Login / logout / register | `authClient.js` |
| Business card / storage upload | `supabaseStorage.js` |
| OCR pipeline stages | `monitoringBridge.js` ← debug pipeline events |
| AI request/response/failure | `monitoringBridge.js` + `aiClient.js` |
| Realtime connection | `supabaseEntity.js` |
| Navigation | `SentryRouteTracker` |
| Network offline/online | `sentryInit.js` |

---

## Error Categories & Subsystems

`captureRuntimeError()` tags every failure:

| Subsystem | Examples |
|-----------|----------|
| `AUTH` | Login failure, session restore, ensureAppUser |
| `SUPABASE` | API 4xx/5xx to Supabase REST |
| `OCR` | Pipeline stage failures |
| `AI` | Edge/AI gateway failures |
| `STORAGE` | Upload / signed URL errors |
| `REALTIME` | Channel issues (via API layer) |
| `NETWORK` | Fetch failures |
| `UI` | Unhandled exceptions |

---

## Performance Monitoring

Enabled via `browserTracingIntegration()`:

- Page load / navigation spans
- HTTP client spans (Supabase, AI, storage) from fetch interceptor bridge
- LCP via existing debug performance hooks (surfaced in debug console; Sentry tracing captures navigation)

Sample rates:

- **Traces:** 100% dev, 20% production
- **Replay on error:** 100% production when DSN set

---

## Source Maps

`vite.config.js` sets `build.sourcemap: true`.

When `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set at build time, `@sentry/vite-plugin` uploads maps and deletes them from `dist/` after upload.

Production stack traces reference original `src/` files when upload succeeds.

---

## Edge Functions

`supabase/functions/_shared/sentry.ts` reports AI handler failures when `SENTRY_DSN` is configured as an Edge secret. Structured JSON is always logged to Supabase function logs.

---

## Disabling Monitoring

1. Remove or unset `VITE_SENTRY_DSN` — SDK never initializes.
2. For CI builds without map upload, omit `SENTRY_AUTH_TOKEN` (maps still generated locally but not uploaded).

---

## Verification Checklist

Use this after configuring a Sentry project and DSN.

### Setup

- [ ] Set `VITE_SENTRY_DSN` in `.env.local` or Vercel
- [ ] Set `VITE_SENTRY_ENVIRONMENT` (`development` / `preview` / `production`)
- [ ] Deploy or run `npm run dev` with DSN present
- [ ] Confirm Sentry project receives a startup navigation breadcrumb

### Trigger & verify in Sentry

| # | Trigger | Expected subsystem | How |
|---|---------|-------------------|-----|
| 1 | Manual JS error | `UI` | Debug console → Errors → "Trigger test error" or `throw new Error('RC10.6 test')` in console |
| 2 | React rendering error | `UI` | Debug console Playwright section test hooks (if enabled) or temporary broken component in dev |
| 3 | OCR failure | `OCR` | Run OCR with invalid image / disabled AI |
| 4 | AI timeout | `AI` | Call AI with network throttling or invalid edge config |
| 5 | Storage failure | `STORAGE` | Debug console → Storage → test upload without auth |
| 6 | Unauthorized API | `AUTH` / `SUPABASE` | Expire session and perform authenticated action |
| 7 | Network offline | `NETWORK` | DevTools → Offline, navigate or fetch |

### Validate event payload

- [ ] Release matches `booth-bridge@*+*`
- [ ] Environment tag correct
- [ ] Route tag matches current path
- [ ] User context present when logged in
- [ ] No JWT, passwords, or API keys in event JSON
- [ ] Stack trace resolves to `src/` files (production with source maps)

### Regression

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

---

## Related

- Debug console security: `docs/rc10-6-debug-security.md`
- RC10.5 debug console: `docs/rc10-5-debug-console.md`
