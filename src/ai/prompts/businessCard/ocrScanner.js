/** OCR Scanner — business card extraction prompt (verbatim from OCRScanner.jsx). */
export function ocrScannerBusinessCardPrompt() {
  return "Extract all contact information from this business card image. Return a JSON object with: first_name, last_name, full_name, position, company, department, email, phone, mobile, whatsapp, website, address, country, city, linkedin, confidence (0-100 number). Set fields to empty string if not found.";
}

/** OCR Scanner — event badge extraction prompt (verbatim from OCRScanner.jsx). */
export function ocrScannerBadgePrompt() {
  return "Extract all information from this trade show badge. Return a JSON object with: first_name, last_name, full_name, company, position, country, industry, badge_number, booth_number, event_name, confidence (0-100 number). Set fields to empty string if not found.";
}

export const OCR_SCANNER_BUSINESS_CARD_SCHEMA = {
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
    whatsapp: { type: "string" },
    website: { type: "string" },
    address: { type: "string" },
    country: { type: "string" },
    city: { type: "string" },
    linkedin: { type: "string" },
    badge_number: { type: "string" },
    booth_number: { type: "string" },
    event_name: { type: "string" },
    industry: { type: "string" },
    confidence: { type: "number" },
  },
};
