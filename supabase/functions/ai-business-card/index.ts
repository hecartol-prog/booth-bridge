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

const MAX_OCR_SIZE = 100_000; // 100KB

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    // Block private IPs and metadata endpoints
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname === "localhost" ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("127.") ||
      hostname === "metadata.google.internal" ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

class RequestValidationError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "RequestValidationError";
    this.code = code;
    this.status = status;
  }
}

Deno.serve((req) =>
  handleAiRequest(req, {
    requireAuth: true,
    functionName: "ai-business-card",
    buildRequest: (body): CompletionRequest => {
      const mode = typeof body.mode === "string" ? body.mode : "ocr_ai";
      const ocrJson = body.ocr_json || body.ocrJson;

      if (ocrJson && JSON.stringify(ocrJson).length > MAX_OCR_SIZE) {
        throw new RequestValidationError(
          "OCR input exceeds size limit",
          "PAYLOAD_TOO_LARGE",
          413,
        );
      }

      const rawUrls = Array.isArray(body.file_urls)
        ? (body.file_urls as string[])
        : body.file_url
        ? [String(body.file_url)]
        : [];

      for (const url of rawUrls) {
        if (typeof url !== "string" || !isAllowedUrl(url)) {
          throw new RequestValidationError(
            "file_urls contains disallowed addresses",
            "INVALID_FILE_URL",
            400,
          );
        }
      }

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
        file_urls: rawUrls.length ? rawUrls : undefined,
        response_json_schema: body.response_json_schema as Record<string, unknown> | undefined,
        json_schema: body.json_schema as Record<string, unknown> | undefined,
      };
    },
  })
);
