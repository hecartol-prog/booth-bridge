import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { errorEnvelope, successEnvelope } from "../_shared/envelope.ts";
import { validateJwt } from "../_shared/auth.ts";
import {
  getActiveGatewayName,
  getActiveProviderName,
  getDefaultModel,
  getFallbackProviderName,
  getGatewayVersion,
  getRequestTimeoutMs,
  getRoutingPlan,
  probeProvider,
} from "../_shared/aiGateway.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(req, errorEnvelope("Method not allowed.", { code: "METHOD_NOT_ALLOWED" }), 405);
  }

  const started = Date.now();

  try {
    const auth = await validateJwt(req);
    if (!auth.ok) {
      return jsonResponse(
        req,
        errorEnvelope(auth.message, { code: "AI_AUTHENTICATION", latency: Date.now() - started }),
        auth.status,
      );
    }

    const body = await req.json().catch(() => ({})) as { ping?: boolean };
    const probe = body.ping ? await probeProvider() : null;
    const selectedProvider = getActiveProviderName();
    const activeModel = getDefaultModel();
    const fallbackProvider = getFallbackProviderName();
    const gateway = getActiveGatewayName();
    const latency = Date.now() - started;

    return jsonResponse(
      req,
      successEnvelope({
        result: {
          status: probe?.ok === false ? "degraded" : "ok",
          backend: "supabase",
          gateway,
          provider: selectedProvider,
          model: activeModel,
          selectedProvider,
          activeModel,
          fallbackProvider,
          gatewayVersion: getGatewayVersion(),
          requestTimeoutMs: getRequestTimeoutMs(),
          latency,
          providerHealth: probe?.providers ?? [],
          routing: getRoutingPlan(),
          probe,
        },
        provider: selectedProvider,
        model: activeModel,
        latency,
        metadata: { ping: Boolean(body.ping) },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      req,
      errorEnvelope(message, {
        code: "EDGE_FUNCTION_ERROR",
        latency: Date.now() - started,
      }),
      500,
    );
  }
});
