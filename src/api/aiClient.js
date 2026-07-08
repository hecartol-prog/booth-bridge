/**
 * aiClient — AI provider abstraction (Phase 7.4D / 7.6C).
 *
 * Supabase Edge Functions wrapper. Pages import this module only.
 */

import { isAiEnabled } from "@/config/backend";
import * as aiGateway from "@/api/aiGateway";
import { createAiResponse, extractTextResult, extractDocumentOutput } from "@/ai/aiResponse";
import { AiClientError, normalizeAiError } from "@/ai/aiErrors";
import {
  ocrScannerBusinessCardPrompt,
  ocrScannerBadgePrompt,
  OCR_SCANNER_BUSINESS_CARD_SCHEMA,
} from "@/ai/prompts/businessCard/ocrScanner";
import {
  businessCardExtractPrompt,
  BUSINESS_CARD_EXTRACT_SCHEMA,
  badgeExtractPrompt,
  BADGE_EXTRACT_SCHEMA,
} from "@/ai/prompts/businessCard/extract";
import {
  buildBoothAssistantChatPrompt,
  buildBoothAssistantPrompt,
} from "@/ai/prompts/system/boothAssistant";
import { ONBOARDING_CARD_SCHEMA } from "@/ai/prompts/document/onboardingCard";
import { buildClassifyPrompt } from "@/ai/prompts/document/classify";
import { buildLeadSummaryPrompt } from "@/ai/prompts/summary/index";
import { buildMatchPrompt } from "@/ai/prompts/matching/index";
import { buildRecommendPrompt } from "@/ai/prompts/recommendation/index";

/** @type {Map<string, AbortController>} */
const activeRequests = new Map();
let requestCounter = 0;

function ensureAiEnabled() {
  if (!isAiEnabled()) {
    throw new AiClientError(
      normalizeAiError(new Error("AI features are disabled (VITE_AI_ENABLED=false)"), {
        provider: "supabase",
        code: "AI_DISABLED",
      })
    );
  }
}

function providerName() {
  return aiGateway.currentGateway();
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ requestId?: string, extractResult?: (raw: T) => * }} [options]
 */
async function runAiRequest(fn, options = {}) {
  ensureAiEnabled();
  const started = Date.now();
  const provider = providerName();

  try {
    const raw = await fn();
    const rawMetadata = raw && typeof raw === "object" ? raw : null;
    const result = options.extractResult ? options.extractResult(raw) : extractTextResult(raw);
    return createAiResponse({
      success: true,
      result,
      raw,
      provider,
      latency: Date.now() - started,
      model: rawMetadata && "model" in rawMetadata && typeof rawMetadata.model === "string"
        ? rawMetadata.model
        : null,
      usage: rawMetadata && "usage" in rawMetadata ? rawMetadata.usage ?? null : null,
      metadata: { requestId: options.requestId || null },
    });
  } catch (error) {
    return createAiResponse({
      success: false,
      error,
      provider,
      latency: Date.now() - started,
      metadata: { requestId: options.requestId || null },
    });
  } finally {
    if (options.requestId) activeRequests.delete(options.requestId);
  }
}

function registerAbortSignal(signal) {
  const requestId = `ai-${++requestCounter}`;
  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  activeRequests.set(requestId, controller);
  return { requestId, signal: controller.signal };
}

// ── Canonical public API ─────────────────────────────────────────────────────

/**
 * General-purpose text / structured generation.
 * @param {Record<string, unknown>} params
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function generate(params, options = {}) {
  const { requestId, signal } = registerAbortSignal(options.signal);

  return runAiRequest(
    () => aiGateway.generate(params, { signal }),
    {
      requestId,
      extractResult: (raw) => extractTextResult(raw) ?? raw,
    }
  );
}

/**
 * Conversational assistant turn.
 * @param {{ companyName?: string, context?: string, history?: Array<{role: string, content: string}>, message: string, prompt?: string, includeShortAnswerSuffix?: boolean }} params
 */
export async function chat(params, options = {}) {
  const historyText = Array.isArray(params.history)
    ? params.history
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n")
    : params.history || "";

  const prompt =
    params.prompt ||
    (params.includeShortAnswerSuffix
      ? buildBoothAssistantPrompt({
          companyName: params.companyName,
          context: params.context || "",
          history: historyText,
          message: params.message,
          includeShortAnswerSuffix: true,
        })
      : buildBoothAssistantChatPrompt({
          companyName: params.companyName,
          context: params.context || "",
          history: params.history || [],
          message: params.message,
        }));

  const response = await generate({ prompt, ...params }, options);
  if (!response.success) return response;

  return {
    ...response,
    result: extractTextResult(response.raw) ?? response.result,
  };
}

/**
 * Structured document extraction from uploaded file URL.
 */
export async function extractDocument(params, options = {}) {
  const payload = {
    file_url: params.file_url || params.fileUrl,
    json_schema: params.json_schema || params.jsonSchema || ONBOARDING_CARD_SCHEMA,
  };

  const { requestId, signal } = registerAbortSignal(options.signal);

  return runAiRequest(
    () => aiGateway.extractDocument(payload, { signal }),
    {
      requestId,
      extractResult: extractDocumentOutput,
    }
  );
}

/**
 * Business card image extraction (with file URL).
 */
export async function extractBusinessCard(imageUrl, options = {}) {
  const params = {
    prompt: businessCardExtractPrompt(),
    file_urls: [imageUrl],
    add_context_from_internet: false,
    response_json_schema: BUSINESS_CARD_EXTRACT_SCHEMA,
  };

  const response = await generate(params, options);
  if (!response.success) return response;
  return { ...response, result: response.raw ?? response.result };
}

/**
 * OCR Scanner flow — include the uploaded image URL when available.
 * @param {{ scanType: 'business_card'|'badge', imageUrl?: string, file_url?: string, fileUrl?: string }} params
 */
export async function extractOcrScan(params, options = {}) {
  const prompt =
    params.scanType === "business_card"
      ? ocrScannerBusinessCardPrompt()
      : ocrScannerBadgePrompt();
  const imageUrl = params.imageUrl || params.file_url || params.fileUrl || null;

  const response = await generate(
    {
      prompt,
      ...(imageUrl ? { file_urls: [imageUrl] } : {}),
      add_context_from_internet: false,
      response_json_schema: OCR_SCANNER_BUSINESS_CARD_SCHEMA,
    },
    options
  );

  if (!response.success) return response;
  return { ...response, result: response.raw ?? response.result };
}

/** Event badge image extraction (with file URL). */
export async function extractBadge(imageUrl, options = {}) {
  const params = {
    prompt: badgeExtractPrompt(),
    file_urls: [imageUrl],
    add_context_from_internet: false,
    response_json_schema: BADGE_EXTRACT_SCHEMA,
  };

  const response = await generate(params, options);
  if (!response.success) return response;
  return { ...response, result: response.raw ?? response.result };
}

export async function summarize(params, options = {}) {
  const prompt = params.prompt || buildLeadSummaryPrompt(params);
  return generate(
    {
      prompt,
      response_json_schema: params.response_json_schema || params.jsonSchema,
    },
    options
  );
}

export async function classify(params, options = {}) {
  const prompt =
    params.prompt ||
    buildClassifyPrompt({ text: params.text, labels: params.labels || [] });

  return generate(
    {
      prompt,
      response_json_schema: params.response_json_schema || {
        type: "object",
        properties: {
          label: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
    options
  );
}

export async function recommend(params, options = {}) {
  const prompt =
    params.prompt ||
    buildRecommendPrompt({
      userProfile: params.userProfile,
      candidates: params.candidates,
      goal: params.goal,
    });

  const { requestId, signal } = registerAbortSignal(options.signal);
  return runAiRequest(
    () => aiGateway.recommend({ ...params, prompt }, { signal }),
    { requestId, extractResult: (raw) => raw?.recommendations ?? raw }
  );
}

export async function match(params, options = {}) {
  const prompt =
    params.prompt ||
    buildMatchPrompt({
      buyerProfile: params.buyerProfile,
      supplierProfile: params.supplierProfile,
    });

  const { requestId, signal } = registerAbortSignal(options.signal);
  return runAiRequest(
    () => aiGateway.match({ ...params, prompt }, { signal }),
    { requestId, extractResult: (raw) => raw?.score != null ? raw : raw }
  );
}

/**
 * Streaming generation stub — yields text chunks.
 */
export async function* stream(params, options = {}) {
  ensureAiEnabled();
  const { requestId, signal } = registerAbortSignal(options.signal);

  try {
    yield* aiGateway.stream(params, {
      signal,
      onChunk: options.onChunk,
    });
  } finally {
    activeRequests.delete(requestId);
  }
}

export async function health() {
  const started = Date.now();
  const probe = await aiGateway.health();
  return createAiResponse({
    success: probe.ok,
    result: probe.ok ? probe.data : null,
    raw: probe,
    error: probe.ok ? null : probe.error,
    provider: "supabase",
    latency: Date.now() - started,
  });
}

export function cancel(requestId) {
  const controller = activeRequests.get(requestId);
  if (!controller) return false;
  controller.abort();
  activeRequests.delete(requestId);
  return true;
}

export function cancelAll() {
  for (const controller of activeRequests.values()) controller.abort();
  activeRequests.clear();
}

// ── Backward-compatible API (Phase 1 / Phase 2) ──────────────────────────────

/** @deprecated Use generate() */
export async function invokeLLM(params) {
  ensureAiEnabled();
  const response = await generate(params);
  if (!response.success) throw new AiClientError(response.error);
  return response.raw ?? response.result;
}

/** @deprecated Use extractDocument() */
export async function extractFromUploadedFile(params) {
  ensureAiEnabled();
  const response = await extractDocument(params);
  if (!response.success) throw new AiClientError(response.error);
  return response.raw ?? { status: "success", output: response.result };
}

/** Booth assistant preset — returns plain text */
export async function boothAssistantChat({ companyName, context, history, message }) {
  const response = await chat({ companyName, context, history, message });
  if (!response.success) throw new AiClientError(response.error);
  return response.result;
}

export const ai = {
  generate,
  chat,
  extractDocument,
  extractBusinessCard,
  extractBadge,
  extractOcrScan,
  summarize,
  classify,
  recommend,
  match,
  stream,
  health,
  cancel,
  cancelAll,
  invokeLLM,
  extractFromUploadedFile,
  boothAssistantChat,
};
