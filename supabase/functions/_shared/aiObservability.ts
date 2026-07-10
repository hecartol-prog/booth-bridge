export type AiExitLog = {
  functionName: string;
  event: "request_exit" | "request_failed" | "request_success";
  status: number;
  stage: string;
  code?: string | null;
  message?: string | null;
  provider?: string | null;
  model?: string | null;
  latency_ms: number;
  userId?: string | null;
  pipelineStage?: string | null;
  providerResponse?: unknown;
  openRouterResponseBody?: unknown;
  details?: unknown;
};

export function isDebugAiEnabled(): boolean {
  return (Deno.env.get("DEBUG_AI") || "false").toLowerCase() === "true";
}

export function logAiObservability(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>,
): void {
  const body = JSON.stringify({
    ts: new Date().toISOString(),
    scope: "ai_observability",
    event,
    ...payload,
  });
  if (level === "error") {
    console.error(body);
    return;
  }
  if (level === "warn") {
    console.warn(body);
    return;
  }
  console.log(body);
}

function truncate(value: string, max = 500): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated ${value.length - max} chars]`;
}

function sanitizeUrl(url: string): string {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    const header = comma >= 0 ? url.slice(0, comma) : url.slice(0, 64);
    const payloadLen = comma >= 0 ? url.length - comma - 1 : 0;
    return `${header},[data-url ${payloadLen} chars]`;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}?[query redacted]`;
  } catch {
    return truncate(url, 200);
  }
}

export function sanitizeIncomingBody(body: Record<string, unknown>): Record<string, unknown> {
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const fileUrl = typeof body.file_url === "string" ? body.file_url : null;
  const fileUrls = Array.isArray(body.file_urls)
    ? body.file_urls.map((entry) => (typeof entry === "string" ? sanitizeUrl(entry) : entry))
    : null;

  return {
    pipeline_stage: typeof body.pipeline_stage === "string" ? body.pipeline_stage : null,
    model: typeof body.model === "string" ? body.model : null,
    stream: Boolean(body.stream),
    has_messages: Array.isArray(body.messages) ? body.messages.length : 0,
    prompt_length: prompt.length,
    prompt_preview: prompt ? truncate(prompt, 240) : null,
    file_url: fileUrl ? sanitizeUrl(fileUrl) : null,
    file_urls: fileUrls,
    has_json_schema: Boolean(body.json_schema || body.response_json_schema),
  };
}

export function extractRequestContext(
  body: Record<string, unknown>,
  completionReq: {
    prompt?: string;
    file_url?: string;
    file_urls?: string[];
    model?: string;
    messages?: unknown[];
  },
) {
  const urls = [
    ...(completionReq.file_urls ?? []),
    ...(completionReq.file_url ? [completionReq.file_url] : []),
  ];
  const prompt =
    typeof completionReq.prompt === "string"
      ? completionReq.prompt
      : typeof body.prompt === "string"
      ? body.prompt
      : "";

  return {
    pipelineStage:
      typeof body.pipeline_stage === "string"
        ? body.pipeline_stage
        : typeof (body as Record<string, unknown>).pipelineStage === "string"
        ? String((body as Record<string, unknown>).pipelineStage)
        : null,
    model:
      typeof completionReq.model === "string"
        ? completionReq.model
        : typeof body.model === "string"
        ? body.model
        : null,
    imageUrls: urls.map(sanitizeUrl),
    promptLength: prompt.length,
  };
}

export function serializeProviderException(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const enriched = error as Error & {
      code?: string;
      status?: number;
      provider?: string;
      gateway?: string;
      model?: string;
      providerResponseBody?: unknown;
      providerStatus?: number;
      attempts?: unknown;
      stack?: string;
    };
    return {
      name: enriched.name,
      message: enriched.message,
      code: enriched.code ?? null,
      status: enriched.status ?? null,
      provider: enriched.provider ?? null,
      gateway: enriched.gateway ?? null,
      model: enriched.model ?? null,
      providerStatus: enriched.providerStatus ?? null,
      providerResponseBody: enriched.providerResponseBody ?? null,
      attempts: enriched.attempts ?? null,
      stack: enriched.stack ?? null,
    };
  }

  return { value: error };
}

export function logAiExit(exit: AiExitLog): void {
  logAiObservability(exit.event === "request_success" ? "info" : "error", exit.event, exit);
}

export function resolveClientMessage(
  message: string,
  details: unknown,
  providerResponseBody: unknown,
): string {
  if (!isDebugAiEnabled()) return message;

  const parts = [message];
  if (providerResponseBody != null) {
    parts.push(
      typeof providerResponseBody === "string"
        ? providerResponseBody
        : JSON.stringify(providerResponseBody),
    );
  } else if (details != null) {
    parts.push(typeof details === "string" ? details : JSON.stringify(details));
  }
  return parts.filter(Boolean).join(" | ");
}
