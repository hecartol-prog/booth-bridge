# Supabase Edge Functions — BoothBridge (Phase 7.4E)

Server-side AI and admin auth for the Supabase backend path.  
Client wiring: `src/api/supabaseAi.js`, `src/api/supabaseAuth.js` (admin uses client auth by default).

**Prompts are not duplicated here.** The client (`aiClient.js`) builds prompts from `src/ai/prompts/` and sends them in the request body. Edge Functions execute provider calls only.

---

## Edge Function Inventory

| Directory | Endpoint | JWT | Client consumer | Purpose |
|-----------|----------|-----|-----------------|---------|
| `admin-auth/` | `POST /functions/v1/admin-auth` | No | Base44 `adminAuth` parity / optional Supabase admin probe | Admin credential validation |
| `ai-generate/` | `POST /functions/v1/ai-generate` | Yes | `supabaseGenerate()` | General LLM / structured / vision |
| `ai-chat/` | `POST /functions/v1/ai-chat` | Yes | `supabaseChat()` | Conversational booth assistant |
| `ai-document/` | `POST /functions/v1/ai-document` | Yes | `supabaseExtractDocument()` | Document extraction from `file_url` |
| `ai-business-card/` | `POST /functions/v1/ai-business-card` | Yes | `supabaseExtractBusinessCard()` | Vision OCR for business cards |
| `ai-summary/` | `POST /functions/v1/ai-summary` | Yes | `supabaseSummarize()` | Lead / content summarization |
| `ai-classify/` | `POST /functions/v1/ai-classify` | Yes | `supabaseClassify()` | Text classification |
| `ai-recommend/` | `POST /functions/v1/ai-recommend` | Yes | `supabaseRecommend()` | Product / supplier recommendations |
| `ai-match/` | `POST /functions/v1/ai-match` | Yes | `supabaseMatch()` | Buyer–supplier matching |
| `ai-health/` | `POST /functions/v1/ai-health` | Yes | `supabaseHealth()` | Provider health probe |

> **Naming note:** Client stubs use `ai-document` and `ai-summary` (not `ai-extract-document` / `ai-summarize`). Function directory names match `EDGE_FUNCTIONS` in `supabaseAi.js`.

---

## Shared modules (`_shared/`)

| Module | Responsibility |
|--------|----------------|
| `cors.ts` | OPTIONS preflight + CORS headers |
| `auth.ts` | JWT validation via `createClient()` + `getUser()` |
| `envelope.ts` | Standard `{ success, result, error, provider, model, latency, usage, metadata }` |
| `provider.ts` | OpenAI / OpenRouter abstraction (env-driven) |
| `handler.ts` | Common AI request pipeline |

---

## Request envelope

```json
{
  "prompt": "string",
  "file_url": "string",
  "file_urls": ["string"],
  "json_schema": {},
  "response_json_schema": {},
  "stream": false
}
```

Prompts are composed client-side and passed in `prompt`. Schemas are passed from client prompt modules.

---

## Response envelope

```json
{
  "success": true,
  "result": {},
  "error": null,
  "provider": "openai",
  "model": "gpt-4o",
  "latency": 842,
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 },
  "metadata": {}
}
```

`ai-document` also returns Base44-compatible `status` + `output` top-level fields.  
`ai-generate` with `stream: true` returns a `chunks` array (stub).

---

## Environment variables (secrets)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | **Yes** | Supabase project URL (auto-injected in hosted runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | JWT validation via `auth.getUser()` |
| `OPENAI_API_KEY` | When `AI_PROVIDER=openai` | OpenAI API key |
| `OPENROUTER_API_KEY` | When `AI_PROVIDER=openrouter` | OpenRouter API key |
| `AI_PROVIDER` | No (default `openai`) | `openai` or `openrouter` |
| `AI_MODEL` | No | Override default model (`gpt-4o` / `openai/gpt-4o`) |
| `ADMIN_EMAIL` | Optional | Legacy admin login (env credential mode) |
| `ADMIN_PASSWORD` | Optional | Legacy admin login (env credential mode) |
| `OPENROUTER_HTTP_REFERER` | Optional | OpenRouter attribution header |
| `OPENROUTER_APP_NAME` | Optional | OpenRouter `X-Title` header |

Set secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-... SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Local development

```bash
supabase start
supabase functions serve --env-file supabase/.env.local
```

---

## Deployment

```bash
supabase functions deploy admin-auth
supabase functions deploy ai-generate ai-chat ai-document ai-business-card ai-summary ai-classify ai-match ai-recommend ai-health
```

---

## CORS

Functions return `Access-Control-Allow-Origin: *` for browser `functions.invoke()` calls. Restrict origins in production via API gateway or custom `CORS_ALLOWED_ORIGINS` (future hardening).
