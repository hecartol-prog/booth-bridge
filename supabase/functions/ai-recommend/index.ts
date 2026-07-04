import { handleAiRequest } from "../_shared/handler.ts";
import type { CompletionRequest } from "../_shared/provider.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    buildRequest: (body): CompletionRequest => ({
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
      response_json_schema: (body.response_json_schema || {
        type: "object",
        properties: {
          score: { type: "number" },
          reasons: { type: "array", items: { type: "string" } },
          concerns: { type: "array", items: { type: "string" } },
        },
      }) as Record<string, unknown>,
    }),
    mapResult: (completion) => completion.parsed ?? completion.text,
  })
);
