import { handleCors, jsonResponse } from "./cors.ts";
import { validateJwt } from "./auth.ts";
import { errorEnvelope, successEnvelope } from "./envelope.ts";
import {
  complete,
  getActiveGatewayName,
  getActiveProviderName,
  getDefaultModel,
  getGatewayVersion,
  getRequestTimeoutMs,
  type CompletionRequest,
  type CompletionResult,
} from "./aiGateway.ts";

export type AiHandlerOptions = {
  requireAuth?: boolean;
  mapResult?: (completion: CompletionResult, body: Record<string, unknown>) => unknown;
  buildRequest?: (body: Record<string, unknown>) => CompletionRequest;
  /** Adds Base44-compatible `status` + `output` fields for document extraction. */
  documentLegacyShape?: boolean;
  /** Returns chunked text when `stream: true` (client stub). */
  streamStub?: boolean;
};

export async function handleAiRequest(
  req: Request,
  options: AiHandlerOptions = {},
): Promise<Response> {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(req, errorEnvelope("Method not allowed.", { code: "METHOD_NOT_ALLOWED" }), 405);
  }

  const started = Date.now();

  try {
    if (options.requireAuth !== false) {
      const auth = await validateJwt(req);
      if (!auth.ok) {
        return jsonResponse(
          req,
          errorEnvelope(auth.message, { code: "AI_AUTHENTICATION", latency: Date.now() - started }),
          auth.status,
        );
      }
    }

    const body = await req.json() as Record<string, unknown>;
    const completionReq = options.buildRequest
      ? options.buildRequest(body)
      : body as CompletionRequest;

    if (!completionReq.prompt && !completionReq.messages?.length && !completionReq.file_url && !completionReq.file_urls?.length) {
      return jsonResponse(
        req,
        errorEnvelope("prompt, messages, or file_url(s) required.", {
          code: "INVALID_REQUEST",
          latency: Date.now() - started,
        }),
        400,
      );
    }

    const completion = await complete(completionReq);
    const result = options.mapResult
      ? options.mapResult(completion, body)
      : completion.parsed ?? completion.text;

    const envelope: Record<string, unknown> = successEnvelope({
      result,
      provider: completion.provider,
      model: completion.model,
      latency: Date.now() - started,
      usage: completion.usage,
      metadata: {
        function: "ai",
        gateway: completion.gateway,
        fallbackProvider: completion.fallbackProvider,
        attempts: completion.attempts,
        gatewayVersion: getGatewayVersion(),
        requestTimeoutMs: getRequestTimeoutMs(),
        pipelineStage: typeof body.pipeline_stage === "string" ? body.pipeline_stage : null,
      },
    });

    if (options.documentLegacyShape) {
      envelope.status = "success";
      envelope.output = result;
    }

    if (options.streamStub && body.stream) {
      const text = typeof result === "string" ? result : JSON.stringify(result);
      envelope.chunks = [text];
      envelope.result = text;
    }

    return jsonResponse(req, envelope);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const gatewayError = error as Error & {
      retryable?: boolean;
      code?: string;
      provider?: string | null;
      gateway?: string | null;
      model?: string | null;
      status?: number;
      attempts?: unknown;
    };
    const retryable = Boolean(gatewayError.retryable);
    const code = gatewayError.code || (message.includes("429")
      ? "AI_RATE_LIMIT"
      : message.includes("401") || message.includes("403")
      ? "AI_AUTHENTICATION"
      : "AI_PROVIDER_ERROR");
    const status = gatewayError.status ||
      (code === "AI_RATE_LIMIT"
        ? 429
        : code === "AI_AUTHENTICATION"
        ? 401
        : code === "AI_TIMEOUT"
        ? 504
        : code === "AI_PROVIDER_UNAVAILABLE"
        ? 503
        : 500);

    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      scope: "ai_handler",
      event: "request_failed",
      code,
      status,
      retryable,
      provider: gatewayError.provider || getActiveProviderName() || null,
      gateway: gatewayError.gateway || getActiveGatewayName() || null,
      model: gatewayError.model || getDefaultModel() || null,
      latency_ms: Date.now() - started,
      attempt_count: Array.isArray(gatewayError.attempts) ? gatewayError.attempts.length : 0,
    }));

    return jsonResponse(
      req,
      errorEnvelope(message, {
        code,
        retryable,
        latency: Date.now() - started,
        provider: gatewayError.provider || getActiveProviderName() || getActiveGatewayName(),
        model: gatewayError.model || getDefaultModel(),
        details: gatewayError.attempts,
        metadata: {
          gateway: gatewayError.gateway || getActiveGatewayName(),
          attempts: gatewayError.attempts || [],
        },
      }),
      status,
    );
  }
}

export function documentResult(completion: CompletionResult): Record<string, unknown> {
  const output = completion.parsed ?? completion.text;
  return { status: "success", output };
}
