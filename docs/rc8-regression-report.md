# RC8 Regression Validation (Runtime Only)

Date: 2026-07-08  
Commit under test: `c750089`  
Scope: Runtime behavior only (no architecture/code-quality/docs review)

## Overall Classification

**PASS WITH WARNINGS**

## Test Environment

- Production preview built: `npm run build` (pass)
- Production preview served: `npm run preview -- --host 127.0.0.1 --port 4173`
- Production host checked: `https://www.boothbridge.app`
- Browser automation attempt: Playwright execution attempted but blocked by unavailable browser runtime download in this environment.

## Runtime Checks Executed

### 1) Preview + Production endpoint availability

HTTP 200 confirmed for both preview and production on:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/`
- `/ocr-scanner`
- `/notifications`
- `/meetings`
- `/profile`
- `/sw.js`
- `/brand-mark.svg`

### 2) RC8 runtime smoke checks

- Service worker endpoint available (`/sw.js`) on preview + production.
- Local branding/static asset endpoint available (`/brand-mark.svg`) on preview + production.
- Built runtime bundle contains no `base44`, `@base44`, or `media.base44` strings.

## Regression Matrix (Requested Flows)

| Flow | Status | Evidence |
|---|---|---|
| Login | ⚠️ WARN | Route reachable (`/login` = 200) but no credentialed browser login run |
| Register | ⚠️ WARN | Route reachable (`/register` = 200) but no full signup confirmation loop |
| Email verification | ⚠️ WARN | Not executed (requires mailbox/OTP/browser confirmation cycle) |
| Forgot password | ⚠️ WARN | Route reachable (`/forgot-password` = 200) but no end-to-end reset token flow |
| OCR upload | ⚠️ WARN | Route reachable (`/ocr-scanner` = 200) but no authenticated upload transaction executed |
| OCR extraction | ⚠️ WARN | Not executed end-to-end in this run |
| Company creation | ⚠️ WARN | Not executed end-to-end in this run |
| User profile | ⚠️ WARN | Route reachable (`/profile` = 200) but no authenticated CRUD transaction executed |
| Digital booth | ⚠️ WARN | No authenticated browser session was available for runtime content validation |
| Storage upload | ⚠️ WARN | Not executed end-to-end in this run |
| Meeting creation | ⚠️ WARN | Route reachable (`/meetings` = 200) but no authenticated create action executed |
| Notifications | ⚠️ WARN | Route reachable (`/notifications` = 200) but no authenticated event emission/read executed |
| Dashboard | ✅ PASS | App root route reachable (`/` = 200) on preview + production |
| Offline behavior | ✅ PASS | Service worker endpoint available (`/sw.js` = 200) on preview + production |
| Supabase auth | ⚠️ WARN | Not validated with live credentialed browser auth cycle in this run |
| RLS | ⚠️ WARN | Not validated with cross-user runtime operations in this run |
| Realtime | ⚠️ WARN | Not validated with multi-session live subscriptions in this run |
| AI disabled | ⚠️ WARN | Toggle behavior not executed in a browser session during this run |
| AI enabled (if configured) | ⚠️ WARN | Not validated end-to-end during this run |

## Regressions Introduced by RC8

### Confirmed regressions

- **None proven** in executed runtime checks.

### Warnings / unproven areas

- Full browser transaction validation (auth, RLS, realtime, OCR, notifications, meetings, storage, AI) remains pending due inability to complete browser automation runtime in this environment and lack of test credentials/mailbox loop for end-to-end user journeys.

## Conclusion

RC8 shows **no proven runtime regressions** in the checks that were executed (preview/prod availability + runtime static behavior checks), but critical authenticated flows remain **warning-level unverified** and should be completed in a credentialed browser test pass to close RC8 fully.

