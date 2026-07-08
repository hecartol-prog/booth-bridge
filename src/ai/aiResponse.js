/**
 * Standardized AI response envelope (Phase 7.4D).
 */

import { normalizeAiError } from "@/ai/aiErrors";

/**
 * @typedef {Object} AiUsage
 * @property {number} [prompt_tokens]
 * @property {number} [completion_tokens]
 * @property {number} [total_tokens]
 */

/**
 * @typedef {Object} AiResponse
 * @property {boolean} success
 * @property {import('@/ai/aiErrors').normalizeAiError extends (...args: any) => infer R ? R : never | null} error
 * @property {string|null} model
 * @property {string} provider
 * @property {number} latency
 * @property {AiUsage|null} usage
 * @property {number|null} tokens
 * @property {*} result
 * @property {*} raw
 * @property {Record<string, unknown>} metadata
 */

/**
 * @param {{
 *   success: boolean,
 *   result?: *,
 *   raw?: *,
 *   error?: unknown,
 *   model?: string|null,
 *   provider?: string,
 *   latency?: number,
 *   usage?: AiUsage|null,
 *   metadata?: Record<string, unknown>,
 * }} params
 * @returns {AiResponse}
 */
export function createAiResponse({
  success,
  result = null,
  raw = null,
  error = null,
  model = null,
  provider = "unknown",
  latency = 0,
  usage = null,
  metadata = {},
}) {
  const normalizedError = success ? null : normalizeAiError(error, { provider });
  const tokens = usage?.total_tokens ?? usage?.completion_tokens ?? null;

  return {
    success,
    error: normalizedError,
    model,
    provider,
    latency,
    usage,
    tokens,
    result,
    raw,
    metadata,
  };
}

/**
 * Extract displayable text from heterogeneous provider payloads.
 * @param {*} raw
 */
export function extractTextResult(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    if (typeof raw.result === "string") return raw.result;
    if (typeof raw.response === "string") return raw.response;
    if (typeof raw.text === "string") return raw.text;
    if (raw.output != null) return raw.output;
  }
  return raw;
}

/**
 * Extract structured document output from gateway response shape.
 * @param {*} raw
 */
export function extractDocumentOutput(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.status === "success" && raw.output != null) return raw.output;
  if (raw.output != null) return raw.output;
  return raw;
}
