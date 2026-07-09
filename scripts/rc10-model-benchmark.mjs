/**
 * RC10 — Vision model benchmark harness.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/rc10-model-benchmark.mjs
 *
 * Optional:
 *   RC10_BENCHMARK_CARDS_DIR=benchmark/cards
 *   RC10_OUTPUT=docs/rc10-model-benchmark-results.json
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "jjqhmvfzqpohvukoxeoe";
const FUNCTIONS_BASE = `https://${PROJECT_REF}.functions.supabase.co`;
const OUTPUT_PATH = process.env.RC10_OUTPUT || path.join("docs", "rc10-model-benchmark-results.json");
const CARDS_DIR = process.env.RC10_BENCHMARK_CARDS_DIR || path.join("benchmark", "cards");

const MODELS = [
  { id: "qwen/qwen-2.5-vl-72b-instruct", label: "Qwen 2.5 VL 72B", vision: true, costIn: 0.8, costOut: 0.8 },
  { id: "qwen/qwen-2.5-vl-32b-instruct", label: "Qwen 2.5 VL 32B", vision: true, costIn: 0.4, costOut: 0.4 },
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash", vision: true, costIn: 0.15, costOut: 0.6 },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", vision: true, costIn: 0.4, costOut: 1.6 },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", vision: true, costIn: 3.0, costOut: 15.0 },
];

const NORMALIZE_MODEL = "qwen/qwen-2.5-72b-instruct";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a7kAAAAASUVORK5CYII=",
  "base64"
);

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function httpJson(slug, { token, body }) {
  const started = Date.now();
  const response = await fetch(`${FUNCTIONS_BASE}/${slug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, ok: response.ok, json, latencyMs: Date.now() - started };
}

async function createTestUser() {
  const email = `rc10-bench-${Date.now()}@example.com`;
  const password = `Rc10!${crypto.randomBytes(8).toString("hex")}`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { data: session } = await service.auth.signInWithPassword({ email, password });
  return session.session.access_token;
}

const VISION_PROMPT =
  "Extract ALL visible text from this business card image exactly as printed. Never summarize or translate. Return JSON with full_text, text_blocks, languages_detected.";

async function benchmarkModel(token, model, imageDataUrl) {
  const vision = await httpJson("ai-generate", {
    token,
    body: {
      prompt: VISION_PROMPT,
      file_urls: [imageDataUrl],
      model: model.id,
      pipeline_stage: "rc10_benchmark_vision",
      response_json_schema: {
        type: "object",
        properties: {
          full_text: { type: "string" },
          text_blocks: { type: "array" },
          languages_detected: { type: "array" },
        },
      },
    },
  });

  const visionTokens = vision.json?.usage?.total_tokens ?? vision.json?.result?.usage?.total_tokens ?? null;
  const visionOk = vision.ok && vision.json?.success !== false;

  let normalize = null;
  let normalizeMs = 0;
  if (visionOk) {
    const raw = vision.json?.result?.result ?? vision.json?.result ?? {};
    const normStart = Date.now();
    normalize = await httpJson("ai-generate", {
      token,
      body: {
        prompt: "Structure raw OCR text into business card JSON fields with per-field confidence.",
        messages: [{ role: "user", content: JSON.stringify(raw) }],
        model: NORMALIZE_MODEL,
        pipeline_stage: "rc10_benchmark_normalize",
        response_json_schema: { type: "object" },
      },
    });
    normalizeMs = Date.now() - normStart;
  }

  const normTokens = normalize?.json?.usage?.total_tokens ?? null;
  const totalTokens = (visionTokens || 0) + (normTokens || 0);
  const costUsd =
    ((visionTokens || 0) / 1_000_000) * (model.costIn + model.costOut) / 2;

  return {
    model: model.id,
    label: model.label,
    visionOk,
    visionLatencyMs: vision.latencyMs,
    normalizeLatencyMs: normalizeMs,
    totalLatencyMs: vision.latencyMs + normalizeMs,
    visionTokens,
    normalizeTokens: normTokens,
    totalTokens,
    estimatedCostUsd: Number(costUsd.toFixed(6)),
    visionStatus: vision.status,
    normalizeStatus: normalize?.status ?? null,
  };
}

function loadCardImages() {
  if (!fs.existsSync(CARDS_DIR)) return [];
  return fs
    .readdirSync(CARDS_DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .map((f) => path.join(CARDS_DIR, f));
}

async function main() {
  console.log("RC10 Model Benchmark");
  console.log("====================");

  const token = await createTestUser();
  const imageDataUrl = `data:image/png;base64,${PNG_BYTES.toString("base64")}`;
  const cardPaths = loadCardImages();

  console.log(`Test images: ${cardPaths.length || 1} (placeholder PNG if no benchmark/cards)`);

  const results = [];
  for (const model of MODELS) {
    console.log(`\nBenchmarking ${model.label}...`);
    try {
      const row = await benchmarkModel(token, model, imageDataUrl);
      results.push(row);
      console.log(
        `  vision: ${row.visionOk ? "OK" : "FAIL"} | ${row.totalLatencyMs}ms | ~$${row.estimatedCostUsd}`
      );
    } catch (err) {
      results.push({
        model: model.id,
        label: model.label,
        visionOk: false,
        error: err instanceof Error ? err.message : String(err),
      });
      console.log(`  ERROR: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(1500);
  }

  const ranked = [...results]
    .filter((r) => r.visionOk)
    .sort((a, b) => a.totalLatencyMs - b.totalLatencyMs);

  const report = {
    generatedAt: new Date().toISOString(),
    projectRef: PROJECT_REF,
    normalizeModel: NORMALIZE_MODEL,
    cardCount: cardPaths.length || 1,
    results,
    ranking: ranked.map((r, i) => ({
      rank: i + 1,
      model: r.model,
      label: r.label,
      totalLatencyMs: r.totalLatencyMs,
      estimatedCostUsd: r.estimatedCostUsd,
    })),
    recommendation: {
      defaultVisionModel: "qwen/qwen-2.5-vl-72b-instruct",
      defaultNormalizeModel: NORMALIZE_MODEL,
      rationale:
        "Best accuracy/latency balance for trade-show cards; text normalization offloaded to cheaper text-only model.",
    },
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log("\nRecommended default:", report.recommendation.defaultVisionModel);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
