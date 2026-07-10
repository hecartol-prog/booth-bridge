import { handleAiRequest } from "../_shared/handler.ts";

Deno.serve((req) =>
  handleAiRequest(req, {
    streamStub: true,
    functionName: "ai-generate",
  })
);
