# Phase 7.8C — AI Gateway Validation

**Generated:** 2026-07-05  
**Gateway implementation:** `supabase/functions/_shared/aiGateway.ts`  
**Health endpoint:** `POST /functions/v1/ai-health` (JWT required)

## Executive Summary

The OpenRouter-first gateway **code** is correct: provider priority, failover, timeouts, and structured logging match Phase 7.7A remediation. **Live AI execution is not production-ready** because `OPENROUTER_API_KEY` is absent on the canonical project and the stored `OPENAI_API_KEY` returned HTTP 401 in Phase 7.6 live tests.

## Provider Priority (configured)

Default order from `DEFAULT_OPENROUTER_PROVIDER_ORDER` and `AI_PROVIDER_ORDER` env:

| Priority | Provider | Gateway | Default model |
|----------|----------|---------|---------------|
| 1 | DeepSeek | OpenRouter | `deepseek/deepseek-chat` |
| 2 | Qwen | OpenRouter | `qwen/qwen-2.5-72b-instruct` |
| 3 | Zhipu | OpenRouter | `zhipuai/glm-4-plus` |
| 4 | Moonshot | OpenRouter | `moonshotai/kimi-k2` |
| 5 | OpenAI | OpenRouter | `openai/gpt-4o-mini` |
| 6 | Claude | OpenRouter | `anthropic/claude-3.5-sonnet` |
| 7 | Gemini | OpenRouter | `google/gemini-2.0-flash-001` |
| 8 | OpenAI | **Direct API** | `gpt-4o-mini` (if `AI_ENABLE_DIRECT_OPENAI_FALLBACK` ≠ `false`) |

OpenRouter is primary (`AI_PROVIDER` default: `openrouter`). Direct OpenAI is **fallback only** after the OpenRouter chain exhausts retryable failures.

## Health Endpoint

`ai-health/index.ts` returns (authenticated):

- `gatewayVersion` — from `AI_GATEWAY_VERSION` or `phase7.7a`
- `requestTimeoutMs` — clamped 1000–5000 ms
- `routing` — full plan with `enabled` per route (key present)
- `providerHealth` — per-provider probe when `{ "ping": true }`
- `selectedProvider`, `activeModel`, `fallbackProvider`

JWT validation enforced (`verify_jwt = true` in `config.toml`).

## Validation Matrix

| Check | Static (code) | Live (Phase 7.6 / secrets audit) |
|-------|---------------|----------------------------------|
| OpenRouter primary | ✅ | ❌ `OPENROUTER_API_KEY` not set |
| Provider detection | ✅ `probeProvider()` | ⚠️ Degraded — only OpenAI key present |
| Routing plan exposure | ✅ `getRoutingPlan()` | Not re-run (no credentials in shell) |
| Failover on 5xx/429/timeout | ✅ Mocked Phase 7.6D | Not live-tested |
| Latency bound | ✅ Max 5000 ms per attempt | — |
| Timeouts | ✅ `AI_TIMEOUT` code, retryable | — |
| Retry behavior | ✅ Non-retryable auth stops chain | — |
| OpenAI fallback only | ✅ Direct route last | ⚠️ Becomes **only** route when OpenRouter key missing |
| Structured logging | ✅ `logStructured()` on failures | Edge logs not inspected this session |

### Live execution results (Phase 7.6, canonical project)

| Function | Reachable | Execution |
|----------|-----------|-------------|
| `ai-health` | ✅ | ✅ Degraded probe (401) |
| `ai-chat` | ✅ | ❌ `AI_AUTHENTICATION` |
| `ai-generate` | ✅ | ❌ `AI_AUTHENTICATION` |
| `ai-document` | ✅ | ❌ `AI_AUTHENTICATION` |
| `ai-business-card` | ✅ | ❌ `AI_AUTHENTICATION` |

Root cause: invalid `OPENAI_API_KEY`; OpenRouter not configured.

## Failover Behavior (code review)

```mermaid
flowchart TD
    REQ[Completion request] --> P1[deepseek via OpenRouter]
    P1 -->|retryable fail| P2[qwen]
    P2 -->|retryable fail| P3[zhipu]
    P3 -->|retryable fail| P4[moonshot]
    P4 -->|retryable fail| P5[openai via OpenRouter]
    P5 -->|retryable fail| P6[claude]
    P6 -->|retryable fail| P7[gemini]
    P7 -->|retryable fail| P8[openai direct]
    P8 -->|fail| ERR[Throw with attempts[]]
    P1 -->|success| OK[Return result]
    P2 --> OK
    P7 --> OK
    P8 --> OK
```

Worst-case latency (all timeouts): ~8 routes × 5000 ms = **40 s** theoretical upper bound before failure. Typical failover is faster on HTTP errors.

## Client Abstraction

- `src/api/aiClient.js` → `aiGateway.js` (transport) → `supabaseAi.js` (Edge invoke)
- No provider names in React pages or `src/ai/prompts/**`
- `VITE_AI_ENABLED=false` disables AI client-side without breaking app load

## Required Operator Actions

```bash
supabase secrets set \
  OPENROUTER_API_KEY=or-... \
  OPENAI_API_KEY=sk-... \
  AI_PROVIDER=openrouter \
  --project-ref jjqhmvfzqpohvukoxeoe
```

Post-rotation smoke:

```bash
# Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
node scripts/phase7-6-e2e-validation.mjs
```

Or authenticated `POST ai-health` with `{ "ping": true }` — expect `status: "ok"` and at least one `providerHealth[].ok === true`.

## Classification

| Area | Status |
|------|--------|
| Gateway code / routing | ✅ PASS |
| Health endpoint shape | ✅ PASS (Phase 7.7A) |
| Live provider credentials | ❌ **FAIL** |
| Production AI readiness | ❌ **BLOCKED** until secrets fixed |
