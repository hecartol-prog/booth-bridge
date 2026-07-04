import { handleAiRequest } from "../_shared/handler.ts";
import type { CompletionRequest } from "../_shared/provider.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    buildRequest: (body): CompletionRequest => ({
      prompt: typeof body.prompt === "string" ? body.prompt : undefined,
      response_json_schema: (body.response_json_schema || body.json_schema) as
        | Record<string, unknown>
        | undefined,
    }),
    mapResult: (completion) => completion.parsed ?? completion.text,
  })
);
