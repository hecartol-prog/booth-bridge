/** Business card extraction prompt (verbatim from aiClient extractBusinessCard). */
export function businessCardExtractPrompt() {
  return "Extract all contact information from this business card image. Return a JSON object with: first_name, last_name, full_name, position, company, department, email, phone, mobile, whatsapp, website, address, country, city, linkedin, confidence (0-100 number). Set fields to empty string if not found.";
}

export const BUSINESS_CARD_EXTRACT_SCHEMA = {
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
    confidence: { type: "number" },
  },
};

/** Event badge extraction prompt (verbatim from aiClient extractBadge). */
export function badgeExtractPrompt() {
  return "Extract all information from this trade show badge. Return a JSON object with: first_name, last_name, full_name, company, position, country, industry, badge_number, booth_number, event_name, confidence (0-100 number). Set fields to empty string if not found.";
}

export const BADGE_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    first_name: { type: "string" },
    last_name: { type: "string" },
    full_name: { type: "string" },
    company: { type: "string" },
    position: { type: "string" },
    country: { type: "string" },
    industry: { type: "string" },
    badge_number: { type: "string" },
    booth_number: { type: "string" },
    event_name: { type: "string" },
    confidence: { type: "number" },
  },
};
