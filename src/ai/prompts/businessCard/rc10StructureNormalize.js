/**
 * RC10 Stage 2 — LLM structures raw OCR text into validated business card fields.
 */

export const RC10_BUSINESS_CARD_FIELD_NAMES = [
  "company_name",
  "legal_company_name",
  "brand_name",
  "first_name",
  "last_name",
  "full_name",
  "job_title",
  "department",
  "email",
  "secondary_email",
  "phone",
  "mobile",
  "fax",
  "website",
  "linkedin",
  "wechat",
  "whatsapp",
  "line",
  "telegram",
  "address",
  "city",
  "state",
  "postal_code",
  "country",
  "industry",
  "company_description",
  "notes",
  "languages_detected",
];

export function rc10StructureNormalizePrompt() {
  return [
    "You structure raw business card OCR text into a BoothBridge registration profile.",
    "",
    "Rules:",
    "- Use ONLY information present in the raw text. NEVER invent, guess, or translate.",
    "- Preserve original language and spelling for all field values.",
    "- If a field is not present in the source text, set value to null and confidence to 0.",
    "- Assign per-field confidence 0-100 based on clarity in source text.",
    "- Set source to one of: vision, inferred, validation.",
    "- inferred: only for safe splits (e.g. full_name → first/last) when unambiguous.",
    "- Multiple phones/emails/addresses: map primary to phone/email/address; extras to mobile/secondary_email/notes.",
    "- Recognize international company suffixes (Ltd, LLC, GmbH, 株式会社, 有限公司, S.A., BV, etc.) in company_name.",
    "- languages_detected: array of ISO 639-1 codes or language names found on the card.",
    "",
    "Return ONLY valid JSON. Each field is an object: { value, confidence, source }.",
  ].join("\n");
}

/** Build JSON schema for per-field confidence objects. */
export function buildRc10StructuredSchema() {
  const fieldSchema = {
    type: "object",
    properties: {
      value: { type: "string" },
      confidence: { type: "number" },
      source: { type: "string", enum: ["vision", "inferred", "validation"] },
    },
    required: ["value", "confidence", "source"],
  };

  /** @type {Record<string, unknown>} */
  const properties = Object.fromEntries(
    RC10_BUSINESS_CARD_FIELD_NAMES.map((name) => [name, fieldSchema])
  );

  properties.languages_detected = {
    type: "object",
    properties: {
      value: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
      source: { type: "string", enum: ["vision", "inferred", "validation"] },
    },
    required: ["value", "confidence", "source"],
  };

  return {
    type: "object",
    properties,
    required: ["company_name", "email", "full_name"],
  };
}

export const RC10_STRUCTURED_SCHEMA = /** @type {Record<string, unknown>} */ (buildRc10StructuredSchema());
