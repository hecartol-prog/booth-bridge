/**
 * RC10 — map normalized OCR/AI output to BoothBridge form fields.
 */

function splitFullName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function pick(raw, ...keys) {
  for (const key of keys) {
    const val = raw[key];
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return "";
}

function overallConfidence(fieldConfidence, raw) {
  if (fieldConfidence && Object.keys(fieldConfidence).length) {
    const scores = Object.values(fieldConfidence).filter((n) => Number.isFinite(n));
    if (scores.length) {
      return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }
  return Number.isFinite(raw.confidence) ? Number(raw.confidence) : null;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {Record<string, number>|null} [fieldConfidence]
 * @returns {Record<string, string|number|null>}
 */
export function mapToRegistrationFields(raw, fieldConfidence = null) {
  if (!raw || typeof raw !== "object") {
    throw new Error("FIELD_MAPPING_EMPTY: No profile data to map.");
  }

  const split = splitFullName(pick(raw, "full_name", "fullName"));
  const firstName = pick(raw, "first_name", "firstName") || split.first;
  const lastName = pick(raw, "last_name", "lastName") || split.last;
  const phone = pick(raw, "phone");
  const mobile = pick(raw, "mobile");
  const address = pick(raw, "address", "company_address", "companyAddress");
  const city = pick(raw, "city");
  const companyAddress = address
    ? (city && !address.toLowerCase().includes(city.toLowerCase()) ? `${address}, ${city}` : address)
    : city;

  return {
    firstName,
    lastName,
    company: pick(raw, "company_name", "company"),
    email: pick(raw, "email"),
    phone,
    mobile,
    jobTitle: pick(raw, "job_title", "position", "jobTitle"),
    companyAddress,
    country: pick(raw, "country"),
    website: pick(raw, "website"),
    linkedin: pick(raw, "linkedin"),
    wechat: pick(raw, "wechat"),
    whatsapp: pick(raw, "whatsapp"),
    confidence: overallConfidence(fieldConfidence, raw),
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {Record<string, number>|null} [fieldConfidence]
 * @returns {Record<string, string|number>}
 */
export function mapToOcrScannerFields(raw, fieldConfidence = null) {
  const split = splitFullName(pick(raw, "full_name", "fullName"));
  const first = pick(raw, "first_name", "firstName") || split.first;
  const last = pick(raw, "last_name", "lastName") || split.last;

  return {
    first_name: first,
    last_name: last,
    full_name: pick(raw, "full_name", "fullName") || `${first} ${last}`.trim(),
    position: pick(raw, "job_title", "position"),
    company: pick(raw, "company_name", "company"),
    department: pick(raw, "department"),
    email: pick(raw, "email"),
    secondary_email: pick(raw, "secondary_email"),
    phone: pick(raw, "phone"),
    mobile: pick(raw, "mobile"),
    fax: pick(raw, "fax"),
    website: pick(raw, "website"),
    address: pick(raw, "address"),
    city: pick(raw, "city"),
    state: pick(raw, "state"),
    postal_code: pick(raw, "postal_code"),
    country: pick(raw, "country"),
    linkedin: pick(raw, "linkedin"),
    wechat: pick(raw, "wechat"),
    whatsapp: pick(raw, "whatsapp"),
    line: pick(raw, "line"),
    telegram: pick(raw, "telegram"),
    industry: pick(raw, "industry"),
    confidence: overallConfidence(fieldConfidence, raw) ?? 75,
  };
}
