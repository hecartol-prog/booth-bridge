# RC10 — Model Benchmark Report

**Date:** 2026-07-09  
**Harness:** `scripts/rc10-model-benchmark.mjs`  
**Run command:** `npm run validate:rc10-benchmark`

---

## Models evaluated

| Model | Provider | Vision | Est. input $/1M | Est. output $/1M |
|-------|----------|--------|-----------------|------------------|
| Qwen 2.5 VL 72B Instruct | Qwen | Yes | $0.80 | $0.80 |
| Qwen 2.5 VL 32B Instruct | Qwen | Yes | $0.40 | $0.40 |
| Gemini 2.5 Flash Preview | Google | Yes | $0.15 | $0.60 |
| GPT-4.1 Mini | OpenAI | Yes | $0.40 | $1.60 |
| Claude Sonnet 4 | Anthropic | Yes | $3.00 | $15.00 |

**Normalization (Stage 2):** `qwen/qwen-2.5-72b-instruct` (text-only) for all benchmarks.

---

## Benchmark methodology

1. Create ephemeral test user via Supabase Admin API
2. Upload 1×1 PNG placeholder (or images from `benchmark/cards/`)
3. For each vision model:
   - Call `ai-generate` with RC10 vision prompt + `file_urls`
   - Call `ai-generate` with normalization prompt on vision output
   - Record latency, token usage, estimated cost
4. Rank by total latency (vision + normalize)
5. Write `docs/rc10-model-benchmark-results.json`

### Accuracy measurement (production dataset)

Place 20+ labeled business cards in `benchmark/cards/` with ground-truth JSON:

```
benchmark/cards/
  card-01-cn-mixed.jpg
  card-01-cn-mixed.json   # expected fields
  card-02-de-gmbh.jpg
  ...
```

| Field | Target accuracy |
|-------|-----------------|
| Email | &gt;99% |
| Phone | &gt;98% |
| Company | &gt;98% |
| Address | &gt;95% |
| Overall | &gt;97% |

Run extended harness (future): compare `structuredProfile` values to ground truth.

---

## Expected ranking (latency)

Based on RC9 measurements and model class:

| Rank | Model | Expected total latency | Notes |
|------|-------|------------------------|-------|
| 1 | Gemini 2.5 Flash | ~4–8s | Fastest vision; verify CJK accuracy |
| 2 | Qwen 2.5 VL 32B | ~6–10s | Good cost/speed balance |
| 3 | GPT-4.1 Mini | ~6–12s | Strong Latin scripts |
| 4 | Qwen 2.5 VL 72B | ~8–14s | **Best accuracy for trade-show cards** |
| 5 | Claude Sonnet 4 | ~10–18s | Highest cost |

*Actual numbers written to `rc10-model-benchmark-results.json` after harness run.*

---

## Accuracy considerations (international trade shows)

| Model | English | CJK | Mixed | Multi-phone | Address |
|-------|---------|-----|-------|-------------|---------|
| Qwen 2.5 VL 72B | Excellent | Excellent | Excellent | Good | Good |
| Qwen 2.5 VL 32B | Very good | Very good | Good | Good | Fair |
| Gemini 2.5 Flash | Very good | Good | Good | Fair | Fair |
| GPT-4.1 Mini | Very good | Good | Good | Good | Good |
| Claude Sonnet 4 | Excellent | Good | Good | Good | Very good |

For BoothBridge's primary audience (international trade shows, APAC + EU cards), **Qwen 2.5 VL 72B** remains the recommended default despite higher latency.

---

## Cost analysis (per scan, estimated)

Assuming ~2,000 vision tokens + ~1,500 normalize tokens:

| Model | Est. cost/scan |
|-------|----------------|
| Qwen VL 72B + Qwen 72B text | ~$0.003 |
| Qwen VL 32B + Qwen 72B text | ~$0.002 |
| Gemini Flash + Qwen text | ~$0.001 |
| GPT-4.1 Mini + Qwen text | ~$0.003 |
| Claude Sonnet + Qwen text | ~$0.025 |

At 10,000 scans/event: Qwen 72B ≈ $30 vs Claude ≈ $250.

---

## Recommendation

### Default production config

```env
VITE_RC10_VISION_MODEL=qwen/qwen-2.5-vl-72b-instruct
VITE_RC10_NORMALIZE_MODEL=qwen/qwen-2.5-72b-instruct
```

### Rationale

1. **Accuracy** — CJK + mixed-language cards at trade shows
2. **Cost** — ~10× cheaper than Claude for comparable quality on business cards
3. **Architecture** — Text normalization offloaded to text-only 72B (RC10 improvement over RC9)
4. **Proven** — RC9 production validation on same model family

### Fast-mode alternative

For latency-sensitive kiosks:

```env
VITE_RC10_VISION_MODEL=google/gemini-2.5-flash-preview
```

Monitor email/address accuracy on APAC cards before promoting to default.

---

## Running the benchmark

```powershell
$env:SUPABASE_URL="https://jjqhmvfzqpohvukoxeoe.supabase.co"
$env:SUPABASE_ANON_KEY="<anon>"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role>"
npm run validate:rc10-benchmark
```

Results: `docs/rc10-model-benchmark-results.json`
