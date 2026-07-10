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
import { captureEdgeException } from "./sentry.ts";
import {
  extractRequestContext,
  isDebugAiEnabled,
  logAiExit,
  logAiObservability,
  resolveClientMessage,
  sanitizeIncomingBody,
  serializeProviderException,
} from "./aiObservability.ts";

export type AiHandlerOptions = {
  requireAuth?: boolean;
  mapResult?: (completion: CompletionResult, body: Record<string, unknown>) => unknown;
  buildRequest?: (body: Record<string, unknown>) => CompletionRequest;
  /** Adds Base44-compatible `status` + `output` fields for document extraction. */
  documentLegacyShape?: boolean;
  /** Returns chunked text when `stream: true` (client stub). */
  streamStub?: boolean;
  functionName?: string;
};

type GatewayErrorShape = Error & {
  retryable?: boolean;
  code?: string;
  provider?: string | null;
  gateway?: string | null;
  model?: string | null;
  status?: number;
  attempts?: unknown;
  providerResponseBody?: unknown;
  providerStatus?: number;
};

function resolveHttpStatus(code: string, explicit?: number): number {
  if (explicit) return explicit;
  if (code === "AI_RATE_LIMIT") return 429;
  if (code === "AI_AUTHENTICATION") return 401;
  if (code === "AI_TIMEOUT") return 504;
  if (code === "AI_PROVIDER_UNAVAILABLE") return 503;
  if (code === "METHOD_NOT_ALLOWED") return 405;
  if (code === "INVALID_REQUEST") return 400;
  return 500;
}

function buildFailureEnvelope(
  stage: string,
  code: string,
  message: string,
  params: {
    provider?: string | null;
    model?: string | null;
    latency: number;
    retryable?: boolean;
    details?: unknown;
    metadata?: Record<string, unknown>;
    providerResponse?: unknown;
    openRouterResponseBody?: unknown;
  },
) {
  const clientMessage = resolveClientMessage(
    message,
    params.details,
    params.openRouterResponseBody ?? params.providerResponse,
  );

  return errorEnvelope(clientMessage, {
    stage,
    code,
    provider: params.provider ?? null,
    model: params.model ?? null,
    latency: params.latency,
    retryable: params.retryable,
    details: params.details,
    metadata: {
      ...(params.metadata ?? {}),
      debugAi: isDebugAiEnabled(),
    },
    providerResponse: params.providerResponse,
    openRouterResponseBody: params.openRouterResponseBody,
  });
}

function respondFailure(
  req: Request,
  functionName: string,
  started: number,
  stage: string,
  code: string,
  message: string,
  params: {
    status?: number;
    provider?: string | null;
    model?: string | null;
    retryable?: boolean;
    details?: unknown;
    metadata?: Record<string, unknown>;
    providerResponse?: unknown;
    openRouterResponseBody?: unknown;
    userId?: string | null;
    pipelineStage?: string | null;
    error?: unknown;
  } = {},
): Response {
  const status = resolveHttpStatus(code, params.status);
  const latency = Date.now() - started;
  const envelope = buildFailureEnvelope(stage, code, message, {
    provider: params.provider,
    model: params.model,
    latency,
    retryable: params.retryable,
    details: params.details,
    metadata: params.metadata,
    providerResponse: params.providerResponse,
    openRouterResponseBody: params.openRouterResponseBody,
  });

  logAiExit({
    functionName,
    event: "request_failed",
    status,
    stage,
    code,
    message,
    provider: params.provider ?? null,
    model: params.model ?? null,
    latency_ms: latency,
    userId: params.userId ?? null,
    pipelineStage: params.pipelineStage ?? null,
    providerResponse: params.providerResponse,
    openRouterResponseBody: params.openRouterResponseBody,
    details: params.details,
  });

  if (params.error) {
    captureEdgeException(params.error, {
      subsystem: "AI",
      code,
      status,
      retryable: Boolean(params.retryable),
      provider: params.provider || getActiveProviderName() || null,
      gateway: getActiveGatewayName() || null,
      model: params.model || getDefaultModel() || null,
      latency_ms: latency,
      stage,
    });
  }

  return jsonResponse(req, envelope, status);
}

export async function handleAiRequest(
  req: Request,
  options: AiHandlerOptions = {},
): Promise<Response> {
  const functionName = options.functionName || "ai-generate";
  const cors = handleCors(req);
  if (cors) return cors;

  const started = Date.now();

  if (req.method !== "POST") {
    return respondFailure(req, functionName, started, "http", "METHOD_NOT_ALLOWED", "Method not allowed.", {
      status: 405,
    });
  }

  let userId: string | null = null;
  let pipelineStage: string | null = null;

  try {
    if (options.requireAuth !== false) {
      const auth = await validateJwt(req);
      if (!auth.ok) {
        return respondFailure(
          req,
          functionName,
          started,
          "auth",
          "AI_AUTHENTICATION",
          auth.message,
          {
            status: auth.status,
            userId: null,
          },
        );
      }
      userId = auth.user.id;
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch (parseError) {
      return respondFailure(
        req,
        functionName,
        started,
        "request_parse",
        "INVALID_REQUEST",
        "Request body must be valid JSON.",
        {
          status: 400,
          userId,
          details: serializeProviderException(parseError),
          error: parseError,
        },
      );
    }

    const completionReq = options.buildRequest
      ? options.buildRequest(body)
      : body as CompletionRequest;
    const requestContext = extractRequestContext(body, completionReq);
    pipelineStage = requestContext.pipelineStage;

    logAiObservability("info", "incoming_request", {
      functionName,
      userId,
      provider: getActiveProviderName(),
      gateway: getActiveGatewayName(),
      selectedModel: requestContext.model ?? getDefaultModel(),
      pipelineStage,
      imageUrls: requestContext.imageUrls,
      promptLength: requestContext.promptLength,
      request: sanitizeIncomingBody(body),
      debugAi: isDebugAiEnabled(),
    });

    if (
      !completionReq.prompt &&
      !completionReq.messages?.length &&
      !completionReq.file_url &&
      !completionReq.file_urls?.length
    ) {
      return respondFailure(
        req,
        functionName,
        started,
        "validation",
        "INVALID_REQUEST",
        "prompt, messages, or file_url(s) required.",
        {
          status: 400,
          userId,
          pipelineStage,
          model: requestContext.model ?? getDefaultModel(),
          provider: getActiveProviderName(),
        },
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
        function: functionName,
        gateway: completion.gateway,
        fallbackProvider: completion.fallbackProvider,
        attempts: completion.attempts,
        gatewayVersion: getGatewayVersion(),
        requestTimeoutMs: getRequestTimeoutMs(),
        pipelineStage,
        userId,
        debugAi: isDebugAiEnabled(),
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

    logAiExit({
      functionName,
      event: "request_success",
      status: 200,
      stage: pipelineStage || "provider",
      code: null,
      message: null,
      provider: completion.provider,
      model: completion.model,
      latency_ms: Date.now() - started,
      userId,
      pipelineStage,
      details: {
        attempts: completion.attempts,
        usage: completion.usage,
      },
    });

    return jsonResponse(req, envelope);
  } catch (error) {
    const gatewayError = error as GatewayErrorShape;
    const message = error instanceof Error ? error.message : String(error);
    const code = gatewayError.code || (message.includes("429")
      ? "AI_RATE_LIMIT"
      : message.includes("401") || message.includes("403")
      ? "AI_AUTHENTICATION"
      : "AI_PROVIDER_ERROR");
    const providerResponseBody = gatewayError.providerResponseBody ?? null;
    const details = {
      attempts: gatewayError.attempts ?? null,
      providerStatus: gatewayError.providerStatus ?? gatewayError.status ?? null,
      providerException: serializeProviderException(error),
      ...(isDebugAiEnabled() && providerResponseBody != null
        ? { openRouterResponseBody: providerResponseBody }
        : {}),
    };

    logAiObservability("error", "provider_exception", {
      functionName,
      userId,
      pipelineStage,
      ...serializeProviderException(error),
      providerResponseBody,
    });

    return respondFailure(
      req,
      functionName,
      started,
      pipelineStage || "provider",
      code,
      message,
      {
        status: gatewayError.status,
        provider: gatewayError.provider || getActiveProviderName() || getActiveGatewayName(),
        model: gatewayError.model || getDefaultModel(),
        retryable: Boolean(gatewayError.retryable),
        details,
        providerResponse: providerResponseBody,
        openRouterResponseBody: providerResponseBody,
        metadata: {
          gateway: gatewayError.gateway || getActiveGatewayName(),
          attempts: gatewayError.attempts || [],
        },
        userId,
        pipelineStage,
        error,
      },
    );
  }
}

export function documentResult(completion: CompletionResult): Record<string, unknown> {
  const output = completion.parsed ?? completion.text;
  return { status: "success", output };
}
