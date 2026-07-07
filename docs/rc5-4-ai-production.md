# RC5-4 — AI Gateway Production Validation

**Generated:** 2026-07-06  
**Canonical project:** `jjqhmvfzqpohvukoxeoe`  
**Gateway implementation:** `supabase/functions/_shared/aiGateway.ts`

---

## Executive Summary

| Check | Result |
|-------|--------|
| Provider order in code | **PASS** (DeepSeek → Qwen → Zhipu → Moonshot → OpenAI → Claude → Gemini) |
| Edge Functions deployed | **PASS** (10/10 ACTIVE) |
| `OPENROUTER_API_KEY` set | **FAIL** — absent on canonical project |
| OpenRouter connectivity (live) | **NOT VERIFIED** — no API key |
| `ai-health` endpoint reachable | **PASS** (returns structured JSON) |
| `ai-health` with valid user JWT | **NOT VERIFIED** |
| AI completion paths | **NOT VERIFIED** live in RC5 |

---

## Required Provider Order (code-verified)

From `supabase/functions/_shared/aiGateway.ts` lines 78–86:

```text
deepseek → qwen → zhipu → moonshot → openai → claude → gemini
```

Override via `AI_PROVIDER_ORDER` env (comma-separated). Default matches RC5 requirement.

Additional routing parameters (code defaults):

| Setting | Default |
|---------|---------|
| `AI_REQUEST_TIMEOUT_MS` | 5000 (clamped 1000–5000) |
| `AI_GATEWAY_VERSION` | `phase7.7a` |
| Primary gateway | `openrouter` when `OPENROUTER_API_KEY` present |
| Fallback gateway | `openai` when `OPENAI_API_KEY` valid |

---

## Secrets Status (canonical project)

```text
supabase secrets list --project-ref jjqhmvfzqpohvukoxeoe
```

| Secret | Present | RC5 impact |
|--------|---------|------------|
| `OPENROUTER_API_KEY` | ❌ **NO** | **Primary gateway blocked** |
| `OPENAI_API_KEY` | ✅ YES | Fallback only; Phase 7.6 reported **invalid key (401)** — **NOT re-tested live in RC5** |
| `AI_PROVIDER` | not set | Defaults to OpenRouter-first logic |
| `AI_PROVIDER_ORDER` | not set | Uses code default chain |

---

## Live Endpoint Tests

### `ai-health` — unauthenticated (anon JWT as Bearer)

```text
POST https://jjqhmvfzqpohvukoxeoe.supabase.co/functions/v1/ai-health
Body: {"ping":true}
Authorization: Bearer <anon JWT>

→ HTTP 401
→ {"success":false,"error":{"code":"AI_AUTHENTICATION","message":"invalid claim: missing sub claim"}}
→ latency: 429ms (reported in envelope)
```

| Interpretation | Status |
|----------------|--------|
| Function reachable | **PASS** |
| JWT validation enforced (`verify_jwt: true`) | **PASS** |
| Provider probe executed | **NO** — rejected before probe (no user `sub`) |

### `ai-health` — with authenticated user JWT

**NOT VERIFIED** — requires signed-in user session. Operator must call from browser Network tab after login or via E2E harness.

### Prior validation (Phase 7.6 — reference only)

| Endpoint | Result |
|----------|--------|
| `ai-health` | Reachable; provider probe **degraded** (invalid OpenAI key) |
| `ai-chat`, `ai-generate`, `ai-document`, `ai-business-card` | **FAIL** — provider `401 invalid_api_key` |

---

## OpenRouter Connectivity

| Test | RC5 status |
|------|------------|
| API key configured | **FAIL** |
| Direct OpenRouter API call | **NOT EXECUTED** (no key) |
| Referer header default | Code uses `https://boothbridge.app` — **NOT VERIFIED** on wire |

**How to verify after key is set:**

```bash
supabase secrets set OPENROUTER_API_KEY=or-... --project-ref jjqhmvfzqpohvukoxeoe
```

Then POST `ai-health` with a **valid user access token** and `{"ping":true}`. Expect `providerHealth` array with per-provider latency and `status: "ok"` or `"degraded"`.

---

## Fallback, Timeouts, Retry Logic (code review — no changes made)

| Behavior | Location | Verified |
|----------|----------|----------|
| Provider chain iteration | `aiGateway.ts` | Code review **PASS** |
| Per-attempt timeout | `REQUEST_TIMEOUT_MS` (max 5s) | Code review **PASS** |
| Retry on retryable errors | Gateway attempt loop | Code review **PASS** |
| Fallback to OpenAI direct | When OpenRouter route fails | Code review **PASS** |
| Client kill switch | `VITE_AI_ENABLED=false` | Code review **PASS** |

**Live latency measurements:** **NOT VERIFIED** (no successful completion in RC5).

---

## Client Integration

| Path | Backend |
|------|---------|
| `src/api/aiClient.js` | Routes to Supabase Edge when `VITE_DATA_BACKEND=supabase` (default) |
| Invoke target | `https://jjqhmvfzqpohvukoxeoe.supabase.co/functions/v1/ai-*` |

Without production Vercel deploy, client AI calls cannot be tested from `boothbridge.app`.

---

## Access Gaps

| Missing | Why it matters |
|---------|----------------|
| `OPENROUTER_API_KEY` value | Cannot test primary provider chain |
| Valid `OPENAI_API_KEY` rotation confirmation | Fallback unproven |
| Authenticated user JWT | `ai-health` ping requires `sub` claim |
| E2E harness re-run | Blocked in RC5 validator session (service-role script) |

---

## How to Verify (Operator Checklist)

1. Set `OPENROUTER_API_KEY` on Supabase project secrets
2. Rotate `OPENAI_API_KEY` to a valid key (fallback)
3. Log in to preview/production app as exhibitor
4. DevTools → copy `access_token` from session
5. `curl -X POST .../ai-health -H "Authorization: Bearer <access_token>" -d '{"ping":true}'`
6. Confirm `routing` shows provider order DeepSeek→Gemini
7. Run OCR scan in app → confirm `ai-business-card` returns structured fields
8. Review Edge Function logs for `ai_gateway` scope entries

---

## Verdict

**FAIL — AI is not production-ready.**

`OPENROUTER_API_KEY` is missing. Live provider probe and completion paths were not validated in RC5. Code and Edge deployment are correct; **credentials and authenticated smoke are blocking.**
