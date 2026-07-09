/**
 * RC10 — Business entity validation layer (flags uncertain values, never rejects).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().\-]{7,20}$/;
const WEBSITE_RE = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i;
const POSTAL_RE = /^[\w\s\-]{3,12}$/;
const COMPANY_SUFFIX_RE =
  /\b(Ltd\.?|Limited|LLC|L\.L\.C\.|Inc\.?|Corp\.?|GmbH|AG|SA|S\.A\.|BV|B\.V\.|Co\.?,?\s*Ltd\.?|株式会社|有限公司|有限责任|股份有限公司|Pte\.?\s*Ltd\.?)\b/i;

const COUNTRY_ALIASES = {
  usa: "United States",
  us: "United States",
  uk: "United Kingdom",
  uae: "United Arab Emirates",
  prc: "China",
  cn: "China",
  jp: "Japan",
  kr: "South Korea",
  de: "Germany",
  fr: "France",
  es: "Spain",
};

/**
 * @param {string|null|undefined} value
 * @param {string} fieldType
 * @returns {{ valid: boolean, flagged: boolean, reason: string|null, normalized: string|null }}
 */
export function validateEntityField(value, fieldType) {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) {
    return { valid: true, flagged: false, reason: null, normalized: null };
  }

  switch (fieldType) {
    case "email":
    case "secondary_email": {
      const ok = EMAIL_RE.test(raw);
      return {
        valid: ok,
        flagged: !ok,
        reason: ok ? null : "Email format uncertain",
        normalized: ok ? raw.toLowerCase() : raw,
      };
    }
    case "phone":
    case "mobile":
    case "fax":
    case "whatsapp": {
      const ok = PHONE_RE.test(raw);
      return {
        valid: ok,
        flagged: !ok,
        reason: ok ? null : "Phone format uncertain",
        normalized: raw.replace(/\s{2,}/g, " "),
      };
    }
    case "website":
    case "linkedin": {
      const ok = WEBSITE_RE.test(raw);
      return {
        valid: ok,
        flagged: !ok,
        reason: ok ? null : "URL format uncertain",
        normalized: raw,
      };
    }
    case "postal_code": {
      const ok = POSTAL_RE.test(raw);
      return {
        valid: ok,
        flagged: !ok,
        reason: ok ? null : "Postal code format uncertain",
        normalized: raw.toUpperCase(),
      };
    }
    case "country": {
      const key = raw.toLowerCase();
      const normalized = COUNTRY_ALIASES[key] || raw;
      return { valid: true, flagged: false, reason: null, normalized };
    }
    case "company_name":
    case "legal_company_name":
    case "brand_name": {
      const hasSuffix = COMPANY_SUFFIX_RE.test(raw);
      return {
        valid: true,
        flagged: !hasSuffix && raw.length < 3,
        reason: !hasSuffix && raw.length < 3 ? "Company name very short" : null,
        normalized: raw,
      };
    }
    default:
      return { valid: true, flagged: false, reason: null, normalized: raw };
  }
}

const FIELD_TYPE_MAP = {
  email: "email",
  secondary_email: "secondary_email",
  phone: "phone",
  mobile: "mobile",
  fax: "fax",
  whatsapp: "whatsapp",
  website: "website",
  linkedin: "linkedin",
  postal_code: "postal_code",
  country: "country",
  company_name: "company_name",
  legal_company_name: "legal_company_name",
  brand_name: "brand_name",
};

/**
 * Apply validation flags to RC10 structured profile.
 * @param {Record<string, { value?: unknown, confidence?: number, source?: string }>} structured
 * @returns {{ profile: Record<string, unknown>, flags: Record<string, string[]>, validationMs: number }}
 */
export function validateStructuredProfile(structured) {
  const started = Date.now();
  const profile = { ...structured };
  /** @type {Record<string, string[]>} */
  const flags = {};

  for (const [field, fieldType] of Object.entries(FIELD_TYPE_MAP)) {
    const entry = profile[field];
    if (!entry || entry.value == null || entry.value === "") continue;

    const result = validateEntityField(String(entry.value), fieldType);
    if (result.normalized && result.normalized !== entry.value) {
      profile[field] = { ...entry, value: result.normalized };
    }
    if (result.flagged) {
      flags[field] = flags[field] || [];
      if (result.reason) flags[field].push(result.reason);
      const currentConf = Number(entry.confidence) || 0;
      profile[field] = {
        ...profile[field],
        confidence: Math.min(currentConf, 75),
        source: "validation",
      };
    }
  }

  return {
    profile,
    flags,
    validationMs: Date.now() - started,
  };
}

/**
 * @param {Record<string, { value?: unknown, confidence?: number }>} structured
 */
export function flattenStructuredProfile(structured) {
  /** @type {Record<string, string|null>} */
  const flat = {};
  /** @type {Record<string, number>} */
  const fieldConfidence = {};

  for (const [key, entry] of Object.entries(structured || {})) {
    if (!entry || typeof entry !== "object") continue;
    const val = entry.value;
    if (Array.isArray(val)) {
      flat[key] = val.length ? val.join(", ") : null;
    } else {
      flat[key] = val == null || val === "" ? null : String(val);
    }
    if (Number.isFinite(entry.confidence)) {
      fieldConfidence[key] = Number(entry.confidence);
    }
  }

  return { flat, fieldConfidence };
}

/** RC10 confidence color tier for UI. */
export function confidenceTier(score) {
  if (score >= 95) return "green";
  if (score >= 80) return "yellow";
  return "red";
}

export function requiresReview(score) {
  return (Number(score) || 0) < 95;
}
