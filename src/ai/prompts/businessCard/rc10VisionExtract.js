/**
 * RC10 Stage 1 — Vision model extracts verbatim text from business card images.
 * Do NOT structure fields here; preserve exact text only.
 */

export function rc10VisionExtractPrompt() {
  return [
    "You are a precision OCR engine for international trade show business cards.",
    "Extract ALL visible text from this image exactly as printed.",
    "",
    "Rules:",
    "- Extract every character, word, line, and block visible on the card.",
    "- NEVER summarize, paraphrase, translate, or invent text.",
    "- Preserve original capitalization, punctuation, accents, and scripts (Latin, CJK, Arabic, etc.).",
    "- Include text from logos only if legible characters are visible.",
    "- Include QR code labels if printed near them (do not decode QR payloads).",
    "- For dual-sided or multi-column layouts, preserve reading order top-to-bottom, left-to-right per region.",
    "- If a side or region has no legible text, omit it.",
    "",
    "Return ONLY valid JSON matching the schema.",
  ].join("\n");
}

export const RC10_VISION_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    full_text: {
      type: "string",
      description: "All visible text concatenated with newlines between logical lines",
    },
    text_blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          region: {
            type: "string",
            description: "Approximate region: header, body, footer, left, right, back",
          },
        },
      },
    },
    languages_detected: {
      type: "array",
      items: { type: "string" },
    },
    layout_notes: {
      type: "string",
      description: "Brief notes on layout: vertical, dual-language, dual-sided, logo-heavy, etc.",
    },
    has_qr_code: { type: "boolean" },
    has_multiple_phones: { type: "boolean" },
    has_multiple_emails: { type: "boolean" },
    has_multiple_addresses: { type: "boolean" },
  },
  required: ["full_text", "text_blocks", "languages_detected"],
};
