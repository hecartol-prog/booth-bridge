import { base44 } from "@/api/base44Client";
import { isBase44 } from "@/config/backend";
import * as supabaseAi from "@/api/supabaseAi";

function useBase44Gateway() {
  return isBase44();
}

export function currentGateway() {
  return useBase44Gateway() ? "base44" : "supabase";
}

export function generate(params, options) {
  if (useBase44Gateway()) {
    return base44.integrations.Core.InvokeLLM(params);
  }

  return supabaseAi.supabaseGenerate(params, options);
}

export function extractDocument(params, options) {
  if (useBase44Gateway()) {
    return base44.integrations.Core.ExtractDataFromUploadedFile(params);
  }

  return supabaseAi.supabaseExtractDocument(params, options);
}

export function recommend(params, options) {
  return useBase44Gateway()
    ? generate(params, options)
    : supabaseAi.supabaseRecommend(params, options);
}

export function match(params, options) {
  return useBase44Gateway()
    ? generate(params, options)
    : supabaseAi.supabaseMatch(params, options);
}

function extractGatewayText(raw) {
  if (typeof raw === "string") return raw;

  /** @type {{ result?: string, response?: string, text?: string } | null} */
  const payload = raw && typeof raw === "object" ? raw : null;
  if (!payload) return JSON.stringify(raw);

  return payload.result || payload.response || payload.text || JSON.stringify(payload);
}

export async function* stream(params, options = {}) {
  if (useBase44Gateway()) {
    const raw = await base44.integrations.Core.InvokeLLM({ ...params, stream: false });
    const text = extractGatewayText(raw);
    if (options.onChunk) options.onChunk(text);
    yield text;
    return;
  }

  yield* supabaseAi.supabaseStream(supabaseAi.EDGE_FUNCTIONS.generate, params, options);
}

export async function health() {
  if (useBase44Gateway()) {
    return {
      ok: true,
      data: {
        success: true,
        result: { status: "ok", backend: "base44" },
        provider: "base44",
        latency: 0,
      },
    };
  }

  return supabaseAi.supabaseHealth();
}
