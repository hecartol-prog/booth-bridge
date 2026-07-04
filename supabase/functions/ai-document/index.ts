import { handleAiRequest } from "../_shared/handler.ts";
import type { CompletionRequest } from "../_shared/provider.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    buildRequest: (body): CompletionRequest => ({
      prompt: [
        "Extract structured data from the uploaded document.",
        body.prompt ? String(body.prompt) : "",
      ].filter(Boolean).join("\n\n"),
      file_url: typeof body.file_url === "string" ? body.file_url : undefined,
      json_schema: body.json_schema as Record<string, unknown> | undefined,
      response_json_schema: (body.json_schema || body.response_json_schema) as
        | Record<string, unknown>
        | undefined,
    }),
    documentLegacyShape: true,
  })
);
