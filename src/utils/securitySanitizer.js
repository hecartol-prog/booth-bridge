/**
 * BoothBridge Security Sanitizer
 * Centralized input sanitization and anti-abuse utility.
 * Pure functions — no side effects, no state, no imports.
 */

const DANGEROUS_PROTO_KEYS = ["__proto__", "constructor", "prototype"];

/**
 * Safe JSON parse with prototype pollution prevention.
 */
export function safeJsonParse(rawString, fallback = null) {
  try {
    const parsed = JSON.parse(rawString);
    if (parsed && typeof parsed === "object") {
      DANGEROUS_PROTO_KEYS.forEach(key => {
        delete parsed[key];
      });
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Sanitize a text string: truncate, strip HTML, escape injection characters.
 */
export function sanitizeText(inputString, maxLength = 255) {
  if (inputString === null || inputString === undefined) return "";
  let s = String(inputString);
  // Truncate
  if (s.length > maxLength) s = s.slice(0, maxLength);
  // Strip HTML / script tags
  s = s.replace(/<[^>]*>/g, "");
  // Escape dangerous characters
  s = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
  return s;
}

/**
 * Validate a field value against a known pattern type.
 * Returns { valid: boolean, reason: string }
 */
export function validateFieldPattern(value, type) {
  if (!value || String(value).trim() === "") return { valid: true, reason: "" }; // empty is allowed

  const s = String(value).trim();

  switch (type) {
    case "email": {
      // RFC 5322 simplified
      const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
      return emailRe.test(s) ? { valid: true, reason: "" } : { valid: false, reason: "Invalid email format" };
    }
    case "phone": {
      const phoneRe = /^[+]?[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/;
      return phoneRe.test(s) ? { valid: true, reason: "" } : { valid: false, reason: "Invalid phone format" };
    }
    case "name_company": {
      // Strip whitespace, block executable-looking patterns
      const scriptRe = /<|>|javascript:|data:|on\w+\s*=/i;
      if (scriptRe.test(s)) return { valid: false, reason: "Invalid characters detected" };
      return { valid: true, reason: "" };
    }
    default:
      return { valid: true, reason: "" };
  }
}

/**
 * Validate a QR code raw string before processing.
 * Returns { valid: boolean, reason: string, sanitized: string }
 */
export const QR_MAX_LENGTH = 2048;
const ALLOWED_PROTOCOLS = ["http:", "https:"];
const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "vbscript:"];

export function validateQRPayload(raw) {
  if (!raw || typeof raw !== "string") {
    return { valid: false, reason: "Empty or invalid QR payload.", sanitized: "" };
  }

  if (raw.length > QR_MAX_LENGTH) {
    return { valid: false, reason: `QR payload exceeds maximum allowed length (${QR_MAX_LENGTH} chars).`, sanitized: "" };
  }

  // Check for blocked protocols
  const lc = raw.trim().toLowerCase();
  for (const proto of BLOCKED_PROTOCOLS) {
    if (lc.startsWith(proto)) {
      return { valid: false, reason: `Blocked protocol detected: ${proto}`, sanitized: "" };
    }
  }

  // If it looks like a URL, validate protocol
  if (lc.startsWith("http://") || lc.startsWith("https://")) {
    try {
      const url = new URL(raw.trim());
      if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
        return { valid: false, reason: `Disallowed URL protocol: ${url.protocol}`, sanitized: "" };
      }
    } catch {
      return { valid: false, reason: "Malformed URL in QR payload.", sanitized: "" };
    }
  }

  return { valid: true, reason: "", sanitized: raw.trim() };
}

/**
 * Sanitize an entire OCR result object field-by-field.
 */
export function sanitizeOCRResult(data) {
  if (!data || typeof data !== "object") return {};
  const textFields = ["full_name", "first_name", "last_name", "position", "company", "department",
    "address", "city", "country", "industry", "badge_number", "booth_number", "event_name",
    "linkedin", "website", "whatsapp", "mobile", "notes"];
  const out = { ...data };
  textFields.forEach(key => {
    if (out[key] !== undefined) out[key] = sanitizeText(out[key], 255);
  });
  // email and phone get shorter limit but no HTML escaping needed (validated separately)
  if (out.email !== undefined) out.email = String(out.email || "").trim().slice(0, 254);
  if (out.phone !== undefined) out.phone = String(out.phone || "").trim().slice(0, 50);
  return out;
}