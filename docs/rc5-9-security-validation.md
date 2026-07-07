# RC5-9 — Security Production Validation

**Generated:** 2026-07-06  
**Canonical project:** `jjqhmvfzqpohvukoxeoe`  
**Method:** Live REST/Edge probes with anon key + code review. No service-role abuse.

---

## Executive Summary

| Attack / control | RC5 live result |
|------------------|-----------------|
| Unauthorized SELECT (anon) | **PASS** — empty result set |
| Invalid JWT | **PASS** — HTTP 401 |
| Unauthorized INSERT (anon) | **NOT VERIFIED** — curl body encoding failed in shell |
| Unauthorized Storage | **NOT VERIFIED** |
| Unauthorized Edge Functions | **PARTIAL PASS** — `ai-health` rejects anon JWT |
| Expired JWT | **NOT VERIFIED** |
| Cross-company REST access | **NOT VERIFIED** |
| Service role in browser bundle | **PASS** (code review — no `VITE_*` service key) |
| Direct REST without apikey | **NOT VERIFIED** |

---

## Live Test Results

### 1. Unauthorized CRUD — REST `booth` table

**Unauthenticated SELECT (apikey only, no user JWT):**

```text
GET /rest/v1/booth?select=id&limit=1
apikey: <anon>

→ HTTP 200
→ Body: []
```

| Verdict | RLS hides all rows from anon — **PASS** |

**Invalid JWT:**

```text
GET /rest/v1/booth?select=id&limit=1
Authorization: Bearer invalid.jwt.token

→ HTTP 401
→ {"code":"PGRST301","message":"JWT cryptographic operation failed"}
```

| Verdict | **PASS** |

**Unauthorized INSERT:**

```text
POST /rest/v1/booth
Body: {"company_id":"...","name":"rc5-unauth-test"}

→ HTTP 400 (PowerShell JSON escaping — malformed body)
```

| Verdict | **NOT VERIFIED** — re-test with proper JSON file or harness |

**Expected behavior (Phase 7.6 / RLS):** INSERT without authenticated user or policy match → HTTP 401/403.

---

### 2. Unauthorized Storage

| Test | RC5 |
|------|-----|
| Upload without auth | **NOT VERIFIED** |
| Download other user's object | **NOT VERIFIED** (Phase 7.6: **PASS** — object not found) |
| List buckets (anon) | HTTP 200, `[]` — enumeration blocked or empty |

---

### 3. Unauthorized Edge Functions

**`ai-health` (requires user JWT):**

```text
POST /functions/v1/ai-health
Authorization: Bearer <anon JWT>

→ HTTP 401
→ error.code: AI_AUTHENTICATION
→ message: invalid claim: missing sub claim
```

| Verdict | **PASS** — anon key cannot invoke AI probe |

**`admin-auth` (`verify_jwt: false`):**

| Test | RC5 |
|------|-----|
| Unauthenticated admin login attempt | **NOT VERIFIED** — should still validate credentials server-side |

---

### 4. Expired JWT

**NOT VERIFIED** — requires generating a token with past `exp` or waiting for session expiry.

**How to verify:** Use jwt.io test token or expired session from browser storage.

---

### 5. Invalid JWT variants

| Variant | Tested | Result |
|---------|--------|--------|
| Malformed string | ✅ | 401 `PGRST301` |
| Anon key as user JWT on Edge | ✅ | 401 `AI_AUTHENTICATION` |
| Tampered signature | ⏭ | NOT VERIFIED |

---

### 6. Cross-company access

**NOT VERIFIED live in RC5.**

Phase 7.6 storage tests: cross-user access **denied**. REST cross-company read requires two authenticated test users — run via E2E harness post-deploy.

---

### 7. Direct REST calls (no apikey header)

**NOT VERIFIED** in RC5.

**Expected:** PostgREST rejects requests without `apikey` header.

---

### 8. Client bundle secret exposure

| Check | Result |
|-------|--------|
| `VITE_SUPABASE_ANON_KEY` in bundle | Expected (public anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` in client | **PASS** — not in `VITE_*` vars |
| Service role in `npm run build` output grep | **NOT RUN** — code policy: never prefix service key with `VITE_` |

---

### 9. CORS (Edge Functions)

`supabase/functions/_shared/cors.ts`: `Access-Control-Allow-Origin: *`

| Assessment |
|------------|
| **Acceptable for MVP** — tighten to `https://boothbridge.app` post-launch (Phase 9.4) |

---

## Known Security Items (unchanged, not regressions)

| Item | Severity | RC5 |
|------|----------|-----|
| CORS wildcard on Edge | Low | Documented |
| `admin-auth` verify_jwt false | Medium | By design — credential gate inside function |
| Notification cross-user insert quirk | Medium | Phase 7.6 defect — not security bypass but functional risk |

---

## How to Verify (Operator Checklist)

1. Re-run INSERT test with valid JSON and anon JWT → expect 401/403
2. Attempt storage upload without `Authorization` → expect 401
3. User A token → read User B company row via REST → expect empty or 403
4. Call `ai-chat` with anon JWT → expect 401
5. Inspect production JS bundle in DevTools Sources — search for `service_role`, `sb_secret`
6. Run `scripts/phase7-6-e2e-validation.mjs` security section

---

## Verdict

**PARTIAL PASS** — anon read isolation and JWT rejection **proven live**. Full CRUD, storage, and cross-company matrix **incomplete**.

No evidence of security **regression**; insufficient coverage for production **sign-off**.
