# RC10.5 — Developer Debug Console

The BoothBridge Developer Debug Console is a floating, developer-only diagnostics panel for local development, pilot events, and production support. It is **never** shown to normal end users.

## How to Enable

The console appears when **any** of these conditions is true:

| Condition | How |
|-----------|-----|
| Development | `npm run dev` (`import.meta.env.DEV`) |
| Debug flag | `VITE_DEBUG_MODE=true` in `.env.local` or Vercel |
| Admin user | Authenticated user with `app_metadata.role` in `admin`, `superadmin`, `systemadmin`, or `supportadmin` |

Normal exhibitors and buyers in production **never** see the console unless they are admins or debug mode is explicitly enabled.

## Keyboard Shortcut

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + D` | Toggle console expanded / collapsed |

The console starts **collapsed** as a small “Debug” pill in the bottom-right corner.

## Architecture

```
App.jsx
  └── DebugConsoleGate.jsx     # Access gate (no bundle load when disabled)
        └── DebugConsole.jsx   # Lazy-loaded UI shell
              └── DebugProvider.jsx
                    ├── debugInterceptors.js   # window.onerror, fetch wrapper
                    ├── pipelineLogger listener  # OCR stage forwarding
                    ├── debugBridge events       # AI request telemetry
                    └── playwrightHooks.js       # window.__BB_DEBUG__

Subsystems emit events via:
  pipelineLogger.js  → forwardPipelineLog()
  aiClient.js        → emitDebugEvent("ai", …)
  fetch interceptor  → addApiRequest()
```

### Module Map

| Module | Purpose |
|--------|---------|
| `src/debug/debugGate.js` | Access control (dev / flag / admin) |
| `src/debug/debugBridge.js` | Zero-cost pub/sub for instrumentation |
| `src/debug/debugStore.js` | Central reactive state |
| `src/debug/debugMask.js` | Secret masking for display & export |
| `src/debug/debugInterceptors.js` | Global error + fetch logging |
| `src/debug/exportReport.js` | JSON report builder & download |
| `src/debug/playwrightHooks.js` | E2E test hooks on `window.__BB_DEBUG__` |
| `src/debug/sections/` | 13 UI section panels |
| `src/debug/DebugConsole.jsx` | Floating resizable panel UI |

## Console Sections

1. **App** — Version, git commit, build timestamp, environment, URL, browser, OS, viewport, route
2. **Auth** — Session, JWT countdown (masked tokens), logout / refresh / validate actions
3. **Supabase** — Connection status, latency, realtime channels, health check
4. **AI** — Provider, models, latency, token usage, last error, health check
5. **OCR** — Pipeline stages (image → compression → upload → vision → normalize → validation → UI)
6. **API** — Live fetch log with filters (errors, AI, Supabase, storage)
7. **Storage** — Bucket status, last upload, test upload button
8. **Database** — React Query cache snapshot (profile, company, meetings, notifications)
9. **Perf** — FPS, JS heap, LCP, render count
10. **Errors** — Runtime errors with copy / clear / export
11. **Flags** — `VITE_*` feature flags and backend config
12. **Logs** — Structured tagged logs (`[AUTH]`, `[OCR]`, `[AI]`, etc.)
13. **E2E** — Playwright hook buttons
14. **Export** — Download `debug-report.json`

## Exporting Reports

Click **Export Debug Report** in the Export section. The file includes:

- Environment & browser metadata
- Session summary (no raw tokens)
- AI / OCR / Supabase / storage / database status
- Last 50 errors and 100 network requests
- Performance snapshot
- Feature flags

All secrets (JWT, API keys, tokens, passwords) are **masked** before export.

Example filename: `debug-report-1710000000000.json`

## Playwright / E2E Hooks

When the debug console is loaded, `window.__BB_DEBUG__` exposes:

```javascript
await window.__BB_DEBUG__.runHealthCheck();
await window.__BB_DEBUG__.runAuthTest();
await window.__BB_DEBUG__.runOcrTest();
await window.__BB_DEBUG__.runStorageTest();
await window.__BB_DEBUG__.runAiTest();
await window.__BB_DEBUG__.runRealtimeTest();
await window.__BB_DEBUG__.runNotificationsTest();

const state = window.__BB_DEBUG__.getState();
const report = window.__BB_DEBUG__.exportReport();
```

Each hook returns `{ ok, name, durationMs, result?, error? }`.

## Structured Logging

Subsystems emit tagged logs visible in the **Logs** section:

| Tag | Source |
|-----|--------|
| `[AUTH]` | Authentication actions |
| `[SUPABASE]` | Supabase / fetch to project URL |
| `[OCR]` | Document intelligence pipeline |
| `[AI]` | AI client requests |
| `[UPLOAD]` | Storage uploads |
| `[STORAGE]` | Storage operations |
| `[REALTIME]` | Realtime subscriptions |
| `[PROFILE]` | Profile loading |
| `[NOTIFICATIONS]` | Notification queries |

Each entry includes: `timestamp`, `severity`, `message`, optional `duration`, and `metadata`.

## Security

- Console bundle is **lazy-loaded** only when the gate allows access
- No raw JWT, API keys, or passwords are displayed
- `debugMask.js` redacts sensitive fields in UI and exports
- Fetch interceptor logs URLs but does not dump Authorization headers

## Build Metadata

`vite.config.js` injects `__BB_BUILD_INFO__`:

```json
{
  "version": "0.0.0",
  "commit": "abc1234",
  "timestamp": "2026-07-10T00:00:00.000Z"
}
```

## Screenshots

> Add screenshots after first local run:
> - Collapsed pill (bottom-right)
> - Expanded console with OCR pipeline section
> - Export report preview

## Future Extensions

- Sentry integration (`@sentry/browser` is already a dependency)
- React component render profiling (slow component detection)
- Offline queue inspection (`offlineScanQueue.js`, `visitorInteractionQueue.js`)
- Realtime channel inspector with message tap
- OCR replay from last captured image
- CI artifact upload for pilot event debug reports
- Role-scoped debug views (support admin vs superadmin)

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

All three must pass before merging RC10.5.
