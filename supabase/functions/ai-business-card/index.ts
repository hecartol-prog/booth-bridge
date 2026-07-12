import { handleAiRequest } from "../_shared/handler.ts";
import type { CompletionRequest } from "../_shared/aiGateway.ts";

const BUSINESS_CARD_NORMALIZED_SCHEMA = {
  type: "object",
  properties: {
    first_name: { type: "string" },
    last_name: { type: "string" },
    full_name: { type: "string" },
    position: { type: "string" },
    company: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    country: { type: "string" },
    confidence: { type: "number" },
  },
};

const OCR_EXTRACT_PROMPT =
  "Extract all contact information from this business card image. Return JSON with first_name, last_name, full_name, position, company, email, phone, mobile, website, country, city, linkedin, confidence (0-100).";

Deno.serve((req) =>
  handleAiRequest(req, {
    requireAuth: false,
    buildRequest: (body): CompletionRequest => {
      const mode = typeof body.mode === "string" ? body.mode : "ocr_ai";
      const ocrJson = body.ocr_json || body.ocrJson;

      if (mode === "normalize" && ocrJson) {
        return {
          prompt:
            "Normalize raw business card OCR JSON into a clean registration profile. Return valid JSON only.",
          messages: [
            {
              role: "user",
              content: `Raw OCR JSON:\n${JSON.stringify(ocrJson)}`,
            },
          ],
          response_json_schema: BUSINESS_CARD_NORMALIZED_SCHEMA,
        };
      }

      return {
        prompt: typeof body.prompt === "string" ? body.prompt : OCR_EXTRACT_PROMPT,
        file_urls: Array.isArray(body.file_urls)
          ? body.file_urls as string[]
          : body.file_url
          ? [String(body.file_url)]
          : undefined,
        response_json_schema: body.response_json_schema as Record<string, unknown> | undefined,
        json_schema: body.json_schema as Record<string, unknown> | undefined,
      };
    },
  })
);
