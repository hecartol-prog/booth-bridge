# RC10.6 — ai-generate observability audit

**Date:** 2026-07-10  
**Scope:** `ai-generate` Edge Function and shared AI handler/gateway observability only.

---

## Instrumentation added

| File | Change |
|------|--------|
| `supabase/functions/_shared/aiObservability.ts` | Structured logging helpers, request sanitization, `DEBUG_AI` flag |
| `supabase/functions/_shared/handler.ts` | Incoming request logs, unified exit logging, structured failure envelope |
| `supabase/functions/_shared/envelope.ts` | Top-level `stage`, `code`, `message`, `details`, `providerResponse`, `openRouterResponseBody` on errors |
| `supabase/functions/_shared/aiGateway.ts` | Full OpenRouter error body capture, provider try/catch logging |
| `supabase/functions/ai-generate/index.ts` | `functionName: "ai-generate"` |
| `src/api/supabaseAi.js` | Parse edge error JSON from invoke failures (pass-through only) |
| `src/ai/aiErrors.js` | Preserve structured `code` / `message` from edge payloads |

**Enable debug responses:** `supabase secrets set DEBUG_AI=true --project-ref <ref>`

---

## Every exit point (`handleAiRequest` → `ai-generate`)

| # | Stage | Condition | HTTP | Code | Log event |
|---|-------|-----------|------|------|-----------|
| 1 | `cors` | OPTIONS preflight | 204 | — | (cors.ts only) |
| 2 | `http` | `req.method !== POST` | 405 | `METHOD_NOT_ALLOWED` | `request_failed` |
| 3 | `auth` | JWT missing/invalid | 401 | `AI_AUTHENTICATION` | `request_failed` |
| 4 | `request_parse` | `req.json()` throws | 400 | `INVALID_REQUEST` | `request_failed` |
| 5 | `validation` | No prompt/messages/files | 400 | `INVALID_REQUEST` | `request_failed` |
| 6 | `provider` / `pipeline_stage` | `complete()` throws | 401/429/500/503/504 | gateway code | `provider_exception` + `request_failed` |
| 7 | `provider` / `pipeline_stage` | Success | 200 | — | `request_success` |

### Platform exits (before handler)

| Condition | HTTP | Body | Enters handler? |
|-----------|------|------|-----------------|
| No `Authorization` header | 401 | `{ code: "UNAUTHORIZED_NO_AUTH_HEADER" }` | **No** — Supabase JWT gate |
| Invalid platform JWT | 401 | Platform error JSON | **No** |

---

## Every possible HTTP status from handler

| Status | Source |
|--------|--------|
| **200** | Successful completion |
| **400** | Invalid JSON body, missing prompt/files |
| **401** | Auth failure, OpenRouter 401/403 (mapped to `AI_AUTHENTICATION`) |
| **405** | Non-POST method |
| **429** | OpenRouter rate limit (`AI_RATE_LIMIT`) |
| **500** | Provider error, missing credentials, unclassified failure |
| **503** | Provider unavailable / network (`AI_PROVIDER_UNAVAILABLE`) |
| **504** | Provider timeout (`AI_TIMEOUT`) |

---

## Where errors were swallowed (before this change)

| Location | What was lost |
|----------|----------------|
| `supabase/functions/_shared/aiGateway.ts` → `readErrorText()` | OpenRouter response body reduced to a single string message |
| `supabase/functions/_shared/aiGateway.ts` → `callChatCompletions()` catch | Network/timeout errors rethrown without logging full exception |
| `supabase/functions/_shared/handler.ts` catch | Only summary fields logged; no `providerResponseBody` in response |
| `src/api/supabaseAi.js` → `invokeEdgeFunction()` | Ignored edge JSON body; always surfaced `AI_EDGE_FUNCTION` + generic invoke message |
| `src/ai/aiErrors.js` → `normalizeAiError()` | Plain-object throws lost `message` and `code` → defaulted to `"AI request failed"` |
| `src/api/aiClient.js` → `createAiResponse()` | Re-normalization dropped structured edge fields |

---

## Where useful provider information was discarded (before)

| Step | Discarded data |
|------|----------------|
| OpenRouter `!response.ok` | Full JSON error body (only parsed `.error.message` kept) |
| `createGatewayError()` | No attachment of raw provider payload to thrown error |
| `attemptFromError()` | Only `message` string in attempts array |
| Handler `errorEnvelope()` | No top-level `stage`, `openRouterResponseBody` |
| Client `supabase.functions.invoke` error path | Response body not read from `FunctionsHttpError.context` |

---

## Structured failure response shape (now)

```json
{
  "success": false,
  "stage": "vision_extraction",
  "code": "AI_RATE_LIMIT",
  "provider": "qwen",
  "model": "qwen/qwen-2.5-vl-72b-instruct",
  "message": "qwen via openrouter failed (429): Provider returned error",
  "details": {
    "attempts": [],
    "providerStatus": 429,
    "providerException": { "name": "Error", "message": "...", "stack": "..." },
    "openRouterResponseBody": { "error": { "message": "..." } }
  },
  "providerResponse": { "error": { "message": "..." } },
  "openRouterResponseBody": { "error": { "message": "..." } },
  "error": { "code": "AI_RATE_LIMIT", "message": "...", "retryable": true, "details": {} },
  "latency": 406,
  "metadata": { "debugAi": true }
}
```

When `DEBUG_AI=true`, `message` appends the full OpenRouter response body.

---

## Log events (Edge)

| Event | When |
|-------|------|
| `incoming_request` | After auth + JSON parse; logs userId, model, pipelineStage, image URLs (sanitized), prompt length |
| `provider_http_error` | OpenRouter returns non-2xx |
| `provider_call_failed` | Provider fetch throws or times out |
| `provider_attempt_failed` | Route attempt failed inside `complete()` |
| `provider_exception` | Uncaught gateway error in handler |
| `request_failed` | Every error HTTP response |
| `request_success` | 200 completion |

---

## Deploy note

Redeploy `ai-generate` (and shared `_shared` bundle) after setting `DEBUG_AI`:

```bash
supabase functions deploy ai-generate --project-ref jjqhmvfzqpohvukoxeoe
supabase secrets set DEBUG_AI=true --project-ref jjqhmvfzqpohvukoxeoe
```
