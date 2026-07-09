/** RC9 — Qwen normalization prompt (text-only, post-OCR). */
export function businessCardNormalizePrompt() {
  return [
    "You normalize raw business card OCR JSON into a clean BoothBridge registration profile.",
    "Rules:",
    "- Split full_name into first_name and last_name when possible.",
    "- Normalize phone numbers to international format when country is known.",
    "- Lowercase and trim emails; reject obvious OCR garbage.",
    "- Standardize company names (trim legal suffix noise only when obvious).",
    "- Infer country from address/phone when missing.",
    "- Set confidence 0-100 reflecting field quality after normalization.",
    "- Use empty string for unknown fields, never null.",
    "Return only valid JSON matching the schema.",
  ].join("\n");
}

export const BUSINESS_CARD_NORMALIZED_SCHEMA = {
  type: "object",
  properties: {
    first_name: { type: "string" },
    last_name: { type: "string" },
    full_name: { type: "string" },
    position: { type: "string" },
    company: { type: "string" },
    department: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    mobile: { type: "string" },
    website: { type: "string" },
    address: { type: "string" },
    country: { type: "string" },
    city: { type: "string" },
    linkedin: { type: "string" },
    confidence: { type: "number" },
    normalization_notes: { type: "string" },
  },
  required: ["first_name", "last_name", "company", "email", "confidence"],
};
