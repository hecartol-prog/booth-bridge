# RC10.6 — Debug Console Security

**Generated:** 2026-07-10  
**Scope:** Supabase-authenticated administrator access only — no custom debug password

---

## Security Model

The Developer Debug Console is **not** a public or exhibitor feature. It is an operational tool for authorized BoothBridge administrators debugging production issues.

### Access is granted when ALL are true:

1. **Not emergency-locked** (`VITE_DISABLE_DEBUG_CONSOLE` ≠ `true`)
2. **Authenticated** via Supabase (valid session — not anonymous / anon-only)
3. **Authorized** by one of:
   - `email === support@boothbridge.app` **and** `role === admin`
   - User metadata `is_debug_admin === true` (user, app, or root metadata)
   - Local development: `import.meta.env.DEV` **and** `VITE_DEBUG_MODE === true`

### Never allowed

| Actor | Access |
|-------|--------|
| Anonymous visitors | Denied |
| Unauthenticated sessions | Denied |
| Exhibitors / buyers | Denied |
| Supabase anon key session without user login | Denied |
| Custom debug password | **Removed — not supported** |

Implementation: `src/debug/debugGate.js` → `getDebugAccess()` / `isDebugConsoleEnabled()`

---

## Authentication Flow

```
User logs in via Supabase Auth (email/OAuth)
        ↓
AuthContext loads app user (role, metadata)
        ↓
DebugConsoleGate evaluates getDebugAccess(user, isAuthenticated)
        ↓
If allowed → lazy-load DebugConsole
If denied  → component not mounted, UI prefs collapsed
```

There is **no secondary password** for the debug console. Supabase session + authorization rules are the only gate.

---

## Administrator Access

### Support admin (production)

1. Create or designate Supabase user: `support@boothbridge.app`
2. Set `app_metadata.role = admin` (or equivalent admin role in `user.role`)
3. User signs in through normal login flow
4. Debug button appears (Ctrl+Shift+D)

### Debug admin metadata (break-glass)

Set on user via Supabase Dashboard → Authentication → Users → User Metadata:

```json
{
  "is_debug_admin": true
}
```

### Local development

In `.env.local`:

```env
VITE_DEBUG_MODE=true
```

Requires:

- Running `npm run dev` (`import.meta.env.DEV === true`)
- Authenticated Supabase session (still no anonymous access)

---

## Admin Panel (Debug Console)

The **Admin** tab displays:

| Field | Description |
|-------|-------------|
| Authenticated admin | Current user email |
| Role | Platform role from Supabase |
| Permissions | Granted access reasons |
| Access reason | Primary authorization path |
| Environment | Development / Preview / Production |
| Debug mode | Local override status |
| Emergency lock | `VITE_DISABLE_DEBUG_CONSOLE` state |
| Current build | Package version |
| Git commit | Short SHA from build |

---

## Secret Masking

`src/debug/debugMask.js` masks before UI display and JSON export:

- JWT / access & refresh tokens
- API keys (Supabase, OpenRouter, Stripe, etc.)
- Passwords, SMTP credentials, client secrets
- Bearer tokens and long opaque strings

Auth tab shows **masked** access/refresh tokens only.

Sentry uses the same scrubber via `src/monitoring/sentryScrub.js` — secrets never leave the browser in telemetry.

---

## Emergency Lock

Set in environment (Vercel or `.env.local`):

```env
VITE_DISABLE_DEBUG_CONSOLE=true
```

Effect:

- Debug console cannot open for **any** user, including `support@boothbridge.app`
- Keyboard shortcut (Ctrl+Shift+D) has no effect
- Use during incidents when console surface must be disabled

---

## Session Lifecycle

`DebugConsoleGate` automatically closes access when:

| Event | Behavior |
|-------|----------|
| User logs out | Gate unmounts console |
| Session expires | 30s poll detects missing session → console hidden |
| Role changes | `getDebugAccess` re-evaluated → console hidden |
| Emergency lock enabled at build | Never shown |

Local UI preference (`bb_debug_console` in localStorage) is collapsed when access is revoked.

---

## Sentry Integration

Debug console events feed Sentry through `monitoringBridge.js` when `VITE_SENTRY_DSN` is set. Debug console itself does not send secrets — all payloads pass through `maskSensitiveData()`.

---

## Disabling the Debug Console

| Method | Scope |
|--------|-------|
| `VITE_DISABLE_DEBUG_CONSOLE=true` | All environments (emergency) |
| Remove admin authorization | Per-user (revoke metadata / role) |
| Unset `VITE_DEBUG_MODE` | Local dev only |
| Sign out | Immediate per-session |

---

## Configuration Reference

```env
# Local debug (authenticated + DEV only)
VITE_DEBUG_MODE=true

# Emergency lock
VITE_DISABLE_DEBUG_CONSOLE=true

# NOT USED — no debug password variable exists
```

---

## Threat Model Notes

1. **Anon key exposure** — Expected for Supabase clients; RLS protects data. Debug console does not expose service role or anon key values.
2. **Exhibitor impersonation** — `user_role` alone does not grant debug access.
3. **Production admin** — Only `support@boothbridge.app` + `admin` role or explicit `is_debug_admin` metadata.
4. **XSS + debug console** — If XSS occurs in an admin session, console could leak masked operational data. Keep admin sessions short; use emergency lock during active incidents.

---

## Related

- Sentry setup: `docs/rc10-6-sentry-integration.md`
- RC10.5 baseline: `docs/rc10-5-debug-console.md`
