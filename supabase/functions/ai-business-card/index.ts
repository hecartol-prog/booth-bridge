import { handleAiRequest } from "../_shared/handler.ts";
import type { CompletionRequest } from "../_shared/aiGateway.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    buildRequest: (body): CompletionRequest => ({
      prompt: typeof body.prompt === "string"
        ? body.prompt
        : "Extract all contact information from this business card image.",
      file_urls: Array.isArray(body.file_urls)
        ? body.file_urls as string[]
        : body.file_url
        ? [String(body.file_url)]
        : undefined,
      response_json_schema: body.response_json_schema as Record<string, unknown> | undefined,
      json_schema: body.json_schema as Record<string, unknown> | undefined,
    }),
  })
);
