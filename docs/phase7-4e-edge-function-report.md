# Phase 7.4E — Edge Function Report

**Generated:** 2026-07-03  
**Scope:** Supabase Edge Function server layer only (`supabase/functions/`)  
**Runtime default:** `VITE_DATA_BACKEND=base44` (unchanged)  
**Prior phase:** [7.4D AI Migration](./phase7-4d-ai-migration-report.md)

---

## Final recommendation

### **READY WITH MINOR ACTIONS**

The Edge Function layer is implemented with shared provider abstraction, JWT validation, CORS, and a standardized response envelope. Client code was not modified. Base44 remains the default runtime.

**Minor actions before Phase 7.4F / Supabase AI preview:**

1. Deploy all functions to the Supabase project and set secrets (see Environment Variable Checklist).
2. Smoke-test `ai-health`, `ai-generate`, `ai-document`, and `admin-auth` with `VITE_DATA_BACKEND=supabase`.
3. Create admin test users with `app_metadata.role = 'admin'` (or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` for transitional parity).
4. Tighten CORS from `*` to app origins in production.
5. Validate vision/document flows against real storage signed URLs.

---

## 1. Edge Function Inventory

| Function | Path | JWT (gateway + handler) | Wired in `supabaseAi.js` | Used by `aiClient.js` today |
|----------|------|-------------------------|--------------------------|-----------------------------|
| `admin-auth` | `supabase/functions/admin-auth/` | Gateway: No / Handler: N/A | No (Supabase admin uses `supabaseAuth`) | `authClient.adminLogin` → Base44 only |
| `ai-generate` | `supabase/functions/ai-generate/` | Yes | ✅ | ✅ `generate`, `chat`, `summarize`, `classify`, OCR, vision |
| `ai-chat` | `supabase/functions/ai-chat/` | Yes | ✅ | Indirect (client routes `chat()` through `generate`) |
| `ai-document` | `supabase/functions/ai-document/` | Yes | ✅ | ✅ `extractDocument` |
| `ai-business-card` | `supabase/functions/ai-business-card/` | Yes | ✅ | Indirect (client routes vision through `generate`) |
| `ai-summary` | `supabase/functions/ai-summary/` | Yes | ✅ | Indirect (client routes through `generate`) |
| `ai-classify` | `supabase/functions/ai-classify/` | Yes | ✅ | Indirect (client routes through `generate`) |
| `ai-recommend` | `supabase/functions/ai-recommend/` | Yes | ✅ | ✅ `recommend` (Supabase branch) |
| `ai-match` | `supabase/functions/ai-match/` | Yes | ✅ | ✅ `match` (Supabase branch) |
| `ai-health` | `supabase/functions/ai-health/` | Yes | ✅ | ✅ `health` |

### Naming alignment

| Spec name | Deployed name | Reason |
|-----------|---------------|--------|
| `ai-extract-document` | `ai-document` | Matches `EDGE_FUNCTIONS.document` in `supabaseAi.js` |
| `ai-summarize` | `ai-summary` | Matches `EDGE_FUNCTIONS.summary` in `supabaseAi.js` |

### Shared modules

```
supabase/functions/_shared/
├── cors.ts       # OPTIONS + CORS headers
├── auth.ts       # createClient() + getUser() JWT validation
├── envelope.ts   # Standard JSON response shape
├── provider.ts   # OpenAI / OpenRouter abstraction
└── handler.ts    # AI request pipeline
```

---

## 2. Architecture

```
Browser (VITE_DATA_BACKEND=supabase)
    └── aiClient.js
            └── supabaseAi.js → functions.invoke('ai-*')
                    └── Edge Function
                            ├── validateJwt (createClient + service role)
                            ├── provider.complete() → OpenAI | OpenRouter
                            └── successEnvelope / errorEnvelope
```

**Prompt strategy:** Prompts remain exclusively in `src/ai/prompts/`. The client composes prompt text and JSON schemas; Edge Functions receive `prompt`, `file_url(s)`, and `json_schema` in the request body. **No prompt text is duplicated server-side.**

**Provider strategy:** `AI_PROVIDER` env var selects `openai` or `openrouter`. API keys are read at runtime — no hardcoded provider.

---

## 3. Environment Variable Checklist

| Variable | Required | Set via | Notes |
|----------|----------|---------|-------|
| `SUPABASE_URL` | ✅ | Auto (hosted) / `.env` (local) | Project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | `supabase secrets set` | JWT validation only — never exposed to browser |
| `OPENAI_API_KEY` | ✅ when `AI_PROVIDER=openai` | `supabase secrets set` | Default provider |
| `OPENROUTER_API_KEY` | ✅ when `AI_PROVIDER=openrouter` | `supabase secrets set` | Alternative provider |
| `AI_PROVIDER` | Optional | `supabase secrets set` | `openai` (default) or `openrouter` |
| `AI_MODEL` | Optional | `supabase secrets set` | Default: `gpt-4o` / `openai/gpt-4o` |
| `ADMIN_EMAIL` | Optional | `supabase secrets set` | `admin-auth` env-credential mode |
| `ADMIN_PASSWORD` | Optional | `supabase secrets set` | `admin-auth` env-credential mode |
| `OPENROUTER_HTTP_REFERER` | Optional | `supabase secrets set` | OpenRouter attribution |
| `OPENROUTER_APP_NAME` | Optional | `supabase secrets set` | OpenRouter `X-Title` |

### Deployment commands

```bash
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  AI_PROVIDER=openai

supabase functions deploy admin-auth
supabase functions deploy ai-generate ai-chat ai-document ai-business-card \
  ai-summary ai-classify ai-match ai-recommend ai-health
```

---

## 4. Security Review

| Control | Status | Notes |
|---------|--------|-------|
| JWT validation | ✅ | `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` + `auth.getUser(token)` |
| Gateway JWT (`verify_jwt`) | ✅ | Enabled for all AI functions in `config.toml` |
| Service role exposure | ✅ | Server-side only; not in client bundle |
| Admin auth | ✅ | Env credentials OR Supabase sign-in + `app_metadata.role` check |
| CORS | ⚠️ | `Access-Control-Allow-Origin: *` — tighten for production |
| Rate limiting | ❌ | Not implemented — defer to Phase 7.5+ |
| Usage metering / logging | ❌ | Metadata envelope only — no persistent audit |
| RLS | Unchanged | Per constraints — not enabled in this phase |
| Prompt injection mitigation | ⚠️ | Client-controlled prompts — acceptable for current trust model |
| `user_metadata` for auth | ✅ Avoided | Admin check uses `app_metadata.role` |
| API key in request body | ✅ | Never accepted from client |

### Risk summary

| Risk | Severity | Mitigation |
|------|----------|------------|
| Undeployed functions | High | Deploy + smoke test before Supabase cutover |
| Wildcard CORS | Medium | Restrict to `VITE_APP_URL` origins |
| No per-user AI quotas | Medium | Add rate limits in 7.5 |
| PDF/non-image documents | Low | Vision URL path; PDF text extraction not implemented |
| Streaming stub only | Low | `chunks` array returned; true SSE deferred |

---

## 5. Deployment Checklist

- [ ] Install Supabase CLI (`npm i -g supabase` or scoop/choco)
- [ ] Link project: `supabase link --project-ref <ref>`
- [ ] Set all required secrets (see §3)
- [ ] Deploy `admin-auth` + 9 AI functions
- [ ] Confirm `config.toml` `verify_jwt` settings synced to remote
- [ ] Configure Dashboard CORS / allowed origins for app domain
- [ ] Create admin user with `app_metadata.role = 'admin'`
- [ ] Run health probe: `ai-health` with `{ "ping": true }`
- [ ] Test `ai-generate` with authenticated session
- [ ] Test `ai-document` with storage signed URL + onboarding schema
- [ ] Test `admin-auth` (optional — Supabase path uses client auth today)
- [ ] Switch preview env to `VITE_DATA_BACKEND=supabase` for smoke tests
- [ ] Confirm Base44 path still works (`VITE_DATA_BACKEND=base44`)

---

## 6. Response Contract

All AI functions return:

```json
{
  "success": true,
  "result": "<parsed output>",
  "error": null,
  "provider": "openai",
  "model": "gpt-4o",
  "latency": 842,
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 45,
    "total_tokens": 165
  },
  "metadata": {}
}
```

Special cases:

- **`ai-document`:** adds `status: "success"` and `output` for Base44 `extractDocumentOutput` compatibility.
- **`ai-generate` + `stream: true`:** adds `chunks: ["..."]` (stub, not true SSE).
- **`ai-health`:** returns provider probe without LLM inference.

---

## 7. Constraints compliance

| Constraint | Status |
|------------|--------|
| Do not modify client code | ✅ |
| Do not modify `authClient` | ✅ |
| Do not modify `dbClient` | ✅ |
| Do not modify `storageClient` | ✅ |
| Do not enable RLS | ✅ |
| Do not seed data | ✅ |
| Do not change runtime default | ✅ |
| Do not remove Base44 | ✅ |
| Do not modify pages | ✅ |
| No duplicated prompts | ✅ |
| Deno + Edge Runtime | ✅ |
| `createClient()` JWT validation | ✅ |
| Provider abstraction (OpenAI / OpenRouter) | ✅ |

---

## 8. Files created

| Path | Role |
|------|------|
| `supabase/functions/_shared/*.ts` | Shared CORS, auth, envelope, provider, handler |
| `supabase/functions/admin-auth/index.ts` | Admin credential validation |
| `supabase/functions/ai-*/index.ts` | 9 AI endpoint handlers |
| `supabase/functions/README.md` | Updated inventory + secrets docs |
| `supabase/config.toml` | Per-function `verify_jwt` settings |
| `docs/phase7-4e-edge-function-report.md` | This report |

**Not modified:** `src/**`, migrations, RLS, seed data, runtime config.

---

## 9. Technical debt (deferred)

| Item | Priority | Phase |
|------|----------|-------|
| True SSE streaming | P2 | Post-cutover |
| Per-user AI rate limits | P1 | 7.5 |
| CORS origin allowlist | P1 | Pre-production |
| PDF text extraction pipeline | P2 | Feature backlog |
| Wire dedicated endpoints in `aiClient` (`ai-chat`, `ai-summary`, etc.) | P3 | Optional optimization |
| Persistent AI usage audit log | P2 | 7.5 monitoring |

---

**Next:** Phase 7.4F — deploy, configure secrets, smoke-test Supabase AI path on preview while keeping Base44 as production default.
