/**
 * RC9 — map normalized OCR/AI output to BoothBridge form fields.
 */

function splitFullName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, string|number|null>}
 */
export function mapToRegistrationFields(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("FIELD_MAPPING_EMPTY: No profile data to map.");
  }

  const split = splitFullName(raw.full_name);
  const firstName = String(raw.first_name || split.first || "").trim();
  const lastName = String(raw.last_name || split.last || "").trim();

  return {
    firstName,
    lastName,
    company: String(raw.company || "").trim(),
    email: String(raw.email || "").trim(),
    phone: String(raw.phone || raw.mobile || "").trim(),
    jobTitle: String(raw.position || "").trim(),
    country: String(raw.country || "").trim(),
    confidence: Number.isFinite(raw.confidence) ? Number(raw.confidence) : null,
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, string|number>}
 */
export function mapToOcrScannerFields(raw) {
  const split = splitFullName(raw.full_name);
  return {
    first_name: String(raw.first_name || split.first || "").trim(),
    last_name: String(raw.last_name || split.last || "").trim(),
    full_name: String(raw.full_name || `${split.first} ${split.last}`.trim()).trim(),
    position: String(raw.position || "").trim(),
    company: String(raw.company || "").trim(),
    department: String(raw.department || "").trim(),
    email: String(raw.email || "").trim(),
    phone: String(raw.phone || "").trim(),
    mobile: String(raw.mobile || "").trim(),
    website: String(raw.website || "").trim(),
    address: String(raw.address || "").trim(),
    country: String(raw.country || "").trim(),
    city: String(raw.city || "").trim(),
    linkedin: String(raw.linkedin || "").trim(),
    confidence: Number.isFinite(raw.confidence) ? Number(raw.confidence) : 75,
  };
}
