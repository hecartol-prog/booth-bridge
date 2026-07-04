import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { errorEnvelope, successEnvelope } from "../_shared/envelope.ts";
import { validateJwt } from "../_shared/auth.ts";
import { getActiveProviderName, getDefaultModel, probeProvider } from "../_shared/provider.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(errorEnvelope("Method not allowed.", { code: "METHOD_NOT_ALLOWED" }), 405);
  }

  const started = Date.now();

  try {
    const auth = await validateJwt(req);
    if (!auth.ok) {
      return jsonResponse(
        errorEnvelope(auth.message, { code: "AI_AUTHENTICATION", latency: Date.now() - started }),
        auth.status,
      );
    }

    const body = await req.json().catch(() => ({})) as { ping?: boolean };
    const probe = body.ping ? await probeProvider() : null;

    return jsonResponse(
      successEnvelope({
        result: {
          status: probe?.ok === false ? "degraded" : "ok",
          backend: "supabase",
          provider: getActiveProviderName(),
          model: getDefaultModel(),
          probe,
        },
        provider: getActiveProviderName(),
        model: getDefaultModel(),
        latency: Date.now() - started,
        metadata: { ping: Boolean(body.ping) },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      errorEnvelope(message, {
        code: "EDGE_FUNCTION_ERROR",
        latency: Date.now() - started,
      }),
      500,
    );
  }
});
