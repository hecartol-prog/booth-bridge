/**
 * Unified AI error normalization (Phase 7.4D).
 */

export const AI_ERROR_CODES = {
  TIMEOUT: "AI_TIMEOUT",
  PROVIDER_UNAVAILABLE: "AI_PROVIDER_UNAVAILABLE",
  RATE_LIMIT: "AI_RATE_LIMIT",
  MALFORMED_JSON: "AI_MALFORMED_JSON",
  AUTHENTICATION: "AI_AUTHENTICATION",
  NETWORK: "AI_NETWORK",
  EDGE_FUNCTION: "AI_EDGE_FUNCTION",
  BASE44: "AI_BASE44",
  DISABLED: "AI_DISABLED",
  CANCELLED: "AI_CANCELLED",
  UNKNOWN: "AI_UNKNOWN",
};

/**
 * @param {unknown} error
 * @param {{ provider?: string, code?: string }} [context]
 */
export function normalizeAiError(error, context = {}) {
  const provider = context.provider || "unknown";
  const err = error instanceof Error ? error : null;
  const errRecord = error && typeof error === "object" ? /** @type {Record<string, unknown>} */ (error) : null;
  const message =
    err?.message ||
    (typeof error === "string" ? error : "AI request failed");

  let code = context.code || AI_ERROR_CODES.UNKNOWN;
  const lower = message.toLowerCase();

  if (err?.name === "AbortError" || lower.includes("aborted")) {
    code = AI_ERROR_CODES.CANCELLED;
  } else if (lower.includes("timeout") || lower.includes("timed out")) {
    code = AI_ERROR_CODES.TIMEOUT;
  } else if (lower.includes("rate limit") || lower.includes("429")) {
    code = AI_ERROR_CODES.RATE_LIMIT;
  } else if (
    lower.includes("unauthorized") ||
    lower.includes("authentication") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    code = AI_ERROR_CODES.AUTHENTICATION;
  } else if (lower.includes("network") || lower.includes("fetch")) {
    code = AI_ERROR_CODES.NETWORK;
  } else if (lower.includes("json") || lower.includes("parse")) {
    code = AI_ERROR_CODES.MALFORMED_JSON;
  } else if (lower.includes("edge function") || errRecord?.context === "edge_function") {
    code = AI_ERROR_CODES.EDGE_FUNCTION;
  } else if (provider === "base44") {
    code = AI_ERROR_CODES.BASE44;
  } else if (lower.includes("unavailable") || lower.includes("503")) {
    code = AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
  }

  return {
    code,
    message,
    provider,
    retryable: [
      AI_ERROR_CODES.TIMEOUT,
      AI_ERROR_CODES.RATE_LIMIT,
      AI_ERROR_CODES.NETWORK,
      AI_ERROR_CODES.PROVIDER_UNAVAILABLE,
    ].includes(code),
    details: errRecord?.details || errRecord?.cause || null,
  };
}

export class AiClientError extends Error {
  /** @param {ReturnType<typeof normalizeAiError>} aiError */
  constructor(aiError) {
    super(aiError.message);
    this.name = "AiClientError";
    this.code = aiError.code;
    this.provider = aiError.provider;
    this.retryable = aiError.retryable;
    this.details = aiError.details;
  }
}
