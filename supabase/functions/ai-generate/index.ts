import { handleAiRequest } from "../_shared/handler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    functionName: "ai-generate",
  })
);
