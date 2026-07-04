import { handleAiRequest } from "../_shared/handler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    buildRequest: (body) => ({
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
      messages: Array.isArray(body.messages) ? body.messages : undefined,
      response_json_schema: body.response_json_schema as Record<string, unknown> | undefined,
      json_schema: body.json_schema as Record<string, unknown> | undefined,
      stream: Boolean(body.stream),
      model: typeof body.model === "string" ? body.model : undefined,
    }),
  })
);
