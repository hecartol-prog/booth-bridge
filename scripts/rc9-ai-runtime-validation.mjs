/**
 * RC9 — Business card OCR → AI pipeline runtime validation.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/rc9-ai-runtime-validation.mjs
 *
 * Optional:
 *   RC9_PIPELINE_MODE=ocr_only|ocr_ai|manual
 *   RC9_OUTPUT=docs/rc9-runtime-results.json
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
const RUN_ID = `rc9-${Date.now()}`;
const PIPELINE_MODE = process.env.RC9_PIPELINE_MODE || "ocr_ai";
const OUTPUT_PATH = process.env.RC9_OUTPUT || path.join("docs", "rc9-runtime-results.json");

/** 1x1 red PNG */
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a7kAAAAASUVORK5CYII=",
  "base64"
);

const QWEN_MODEL = "qwen/qwen-2.5-vl-72b-instruct";
const COST_PER_1M_INPUT = 0.8;
const COST_PER_1M_OUTPUT = 0.8;

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeEmail() {
  return `${RUN_ID}@example.com`;
}

function makePassword() {
  return `Rc9!${crypto.randomBytes(8).toString("hex")}`;
}

async function httpJson(slug, { token, body, method = "POST" } = {}) {
  const started = Date.now();
  const response = await fetch(`${FUNCTIONS_BASE}/${slug}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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
  const email = makeEmail();
  const password = makePassword();
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  return {
    userId: data.user.id,
    accessToken: session.session.access_token,
    email,
  };
}

async function uploadOcrImage(userId, token) {
  const started = Date.now();
  const filePath = `scans/${userId}/${RUN_ID}-card.png`;
  const { error } = await service.storage.from("boothbridge-ocr").upload(filePath, PNG_BYTES, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
  const { data: signed, error: signErr } = await service.storage
    .from("boothbridge-ocr")
    .createSignedUrl(filePath, 900);
  if (signErr) throw signErr;
  return {
    filePath,
    signedUrl: signed.signedUrl,
    latencyMs: Date.now() - started,
  };
}

function estimateCost(usage) {
  if (!usage) return null;
  const input = Number(usage.prompt_tokens || 0);
  const output = Number(usage.completion_tokens || 0);
  const usd =
    (input / 1_000_000) * COST_PER_1M_INPUT + (output / 1_000_000) * COST_PER_1M_OUTPUT;
  return { inputTokens: input, outputTokens: output, totalTokens: input + output, usd };
}

function ocrPrompt() {
  return "Extract all contact information from this business card image. Return JSON with first_name, last_name, company, email, phone, confidence.";
}

function normalizePrompt(ocrJson) {
  return {
    prompt: "Normalize raw business card OCR JSON into a clean registration profile.",
    messages: [{ role: "user", content: `Raw OCR JSON:\n${JSON.stringify(ocrJson)}` }],
    response_json_schema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        confidence: { type: "number" },
      },
    },
  };
}

async function runPipelineValidation(token, signedUrl) {
  const stages = [];
  const metrics = {
    compressionMs: 0,
    storageUploadMs: 0,
    ocrMs: 0,
    aiMs: 0,
    fieldMappingMs: 0,
  };

  if (PIPELINE_MODE === "manual") {
    stages.push({ stage: "pipeline", status: "skip", message: "Manual mode" });
    return { stages, metrics, profile: null, usage: { ocr: null, ai: null } };
  }

  // OCR extraction via ai-generate
  const ocrStart = Date.now();
  const ocrRes = await httpJson("ai-generate", {
    token,
    body: {
      prompt: ocrPrompt(),
      file_urls: [signedUrl],
      response_json_schema: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          company: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          confidence: { type: "number" },
        },
      },
      pipeline_stage: "ocr_extraction",
    },
  });
  metrics.ocrMs = Date.now() - ocrStart;
  stages.push({
    stage: "ocr_extraction",
    status: ocrRes.ok ? "ok" : "error",
    latencyMs: metrics.ocrMs,
    httpStatus: ocrRes.status,
    model: ocrRes.json?.model,
    code: ocrRes.json?.error?.code,
    message: ocrRes.json?.error?.message,
  });

  if (!ocrRes.ok) {
    return { stages, metrics, profile: null, usage: { ocr: null, ai: null }, error: ocrRes.json };
  }

  const ocrProfile = ocrRes.json?.result ?? ocrRes.json;
  const ocrUsage = ocrRes.json?.usage ?? null;

  if (PIPELINE_MODE === "ocr_only") {
    stages.push({ stage: "ai_normalization", status: "skip", message: "OCR-only mode" });
    return {
      stages,
      metrics,
      profile: ocrProfile,
      usage: { ocr: ocrUsage, ai: null },
    };
  }

  // AI normalization
  const aiStart = Date.now();
  const aiRes = await httpJson("ai-generate", {
    token,
    body: {
      ...normalizePrompt(ocrProfile),
      pipeline_stage: "ai_normalization",
    },
  });
  metrics.aiMs = Date.now() - aiStart;
  stages.push({
    stage: "ai_normalization",
    status: aiRes.ok ? "ok" : "error",
    latencyMs: metrics.aiMs,
    httpStatus: aiRes.status,
    model: aiRes.json?.model,
    code: aiRes.json?.error?.code,
    message: aiRes.json?.error?.message,
  });

  return {
    stages,
    metrics,
    profile: aiRes.ok ? aiRes.json?.result ?? aiRes.json : ocrProfile,
    usage: { ocr: ocrUsage, ai: aiRes.json?.usage ?? null },
    error: aiRes.ok ? null : aiRes.json,
  };
}

async function verifyEdgeFunctions(token) {
  const functions = [
    "ai-health",
    "ai-generate",
    "ai-document",
    "ai-business-card",
    "ai-chat",
    "ai-summary",
    "ai-classify",
    "ai-match",
    "ai-recommend",
  ];

  const results = {};
  for (const slug of functions) {
    if (slug === "ai-health") {
      results[slug] = await httpJson(slug, { token, body: { ping: true } });
      continue;
    }
    if (slug === "ai-generate") {
      results[slug] = await httpJson(slug, {
        token,
        body: { prompt: "Reply with JSON: {\"ok\":true}", response_json_schema: { type: "object", properties: { ok: { type: "boolean" } } } },
      });
      continue;
    }
    results[slug] = await httpJson(slug, {
      token,
      body: { prompt: "health check — reply ok" },
    });
  }
  return results;
}

async function verifyErrorPaths(token) {
  return {
    no_auth: await httpJson("ai-generate", { body: { prompt: "test" } }),
    anon_jwt: await httpJson("ai-generate", {
      token: SUPABASE_ANON_KEY,
      body: { prompt: "test" },
    }),
    missing_prompt: await httpJson("ai-generate", { token, body: {} }),
    invalid_image: await httpJson("ai-generate", {
      token,
      body: { prompt: ocrPrompt(), file_urls: ["https://example.invalid/nocard.png"] },
    }),
  };
}

async function main() {
  const report = {
    runId: RUN_ID,
    timestamp: new Date().toISOString(),
    projectRef: PROJECT_REF,
    pipelineMode: PIPELINE_MODE,
    productionModel: QWEN_MODEL,
    provider: "openrouter",
  };

  console.log(`RC9 validation starting (${RUN_ID})...`);

  let user;
  try {
    user = await createTestUser();
    report.testUser = { userId: user.userId, email: user.email };
  } catch (error) {
    report.bootstrapError = error instanceof Error ? error.message : String(error);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    console.error("Failed to create test user:", report.bootstrapError);
    process.exit(1);
  }

  try {
    const upload = await uploadOcrImage(user.userId, user.accessToken);
    report.storage = upload;

    const pipeline = await runPipelineValidation(user.accessToken, upload.signedUrl);
    report.pipeline = pipeline;

    const ocrCost = estimateCost(pipeline.usage?.ocr);
    const aiCost = estimateCost(pipeline.usage?.ai);
    report.costEstimate = {
      ocr: ocrCost,
      ai: aiCost,
      totalUsd: (ocrCost?.usd || 0) + (aiCost?.usd || 0),
      model: QWEN_MODEL,
      pricingNote: "OpenRouter Qwen 2.5 VL 72B approx $0.80/1M input, $0.80/1M output",
    };

    report.edgeFunctions = await verifyEdgeFunctions(user.accessToken);
    report.errorPaths = await verifyErrorPaths(user.accessToken);

    report.routing = {
      ai_health: report.edgeFunctions["ai-health"]?.json?.result?.routing ||
        report.edgeFunctions["ai-health"]?.json?.result,
      activeModel: report.edgeFunctions["ai-health"]?.json?.model,
      provider: report.edgeFunctions["ai-health"]?.json?.provider,
    };

    report.summary = {
      pipelineSuccess: pipeline.stages.every((s) => s.status !== "error"),
      totalLatencyMs:
        (pipeline.metrics?.ocrMs || 0) +
        (pipeline.metrics?.aiMs || 0) +
        (upload.latencyMs || 0),
      stagesCompleted: pipeline.stages.filter((s) => s.status === "ok").length,
      stagesFailed: pipeline.stages.filter((s) => s.status === "error").length,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    console.log(`RC9 results written to ${OUTPUT_PATH}`);
    console.log(JSON.stringify(report.summary, null, 2));
  } finally {
    try {
      await service.auth.admin.deleteUser(user.userId);
    } catch {
      // cleanup best-effort
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
