import { handleCors, jsonResponse } from "./cors.ts";
import { validateJwt } from "./auth.ts";
import { errorEnvelope, successEnvelope } from "./envelope.ts";
import {
  complete,
  type CompletionRequest,
  type CompletionResult,
} from "./provider.ts";

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
    return jsonResponse(errorEnvelope("Method not allowed.", { code: "METHOD_NOT_ALLOWED" }), 405);
  }

  const started = Date.now();

  try {
    if (options.requireAuth !== false) {
      const auth = await validateJwt(req);
      if (!auth.ok) {
        return jsonResponse(
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
      metadata: { function: "ai" },
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

    return jsonResponse(envelope);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryable = Boolean((error as Error & { retryable?: boolean }).retryable);
    const code = message.includes("429")
      ? "AI_RATE_LIMIT"
      : message.includes("401") || message.includes("403")
      ? "AI_AUTHENTICATION"
      : "AI_PROVIDER_ERROR";

    return jsonResponse(
      errorEnvelope(message, {
        code,
        retryable,
        latency: Date.now() - started,
        provider: Deno.env.get("AI_PROVIDER") || "openai",
      }),
      code === "AI_RATE_LIMIT" ? 429 : 500,
    );
  }
}

export function documentResult(completion: CompletionResult): Record<string, unknown> {
  const output = completion.parsed ?? completion.text;
  return { status: "success", output };
}
