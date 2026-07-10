/**
 * RC10.5 — Mask secrets before display or export.
 */

const SENSITIVE_KEYS = /^(password|token|secret|api[_-]?key|authorization|refresh[_-]?token|access[_-]?token|jwt|bearer|smtp|openrouter|supabase|anon[_-]?key|service[_-]?role|client[_-]?secret)$/i;

const SENSITIVE_VALUE_PATTERNS = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /(?:sk|pk)_[A-Za-z0-9]+/g,
  /or-[A-Za-z0-9]+/g,
  /GOCSPX-[A-Za-z0-9_-]+/g,
];

/**
 * @param {string} value
 * @param {number} [visible=4]
 */
export function maskSecret(value, visible = 4) {
  if (!value || typeof value !== "string") return "—";
  if (value.length <= visible * 2) return "••••••••";
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

/**
 * @param {unknown} input
 */
export function maskSensitiveData(input) {
  if (input == null) return input;
  if (typeof input === "string") {
    let value = input;
    for (const pattern of SENSITIVE_VALUE_PATTERNS) {
      value = value.replace(pattern, "[Filtered]");
    }
    if (value.length > 40 && /^[A-Za-z0-9._-]+$/.test(value)) {
      return maskSecret(value);
    }
    return value;
  }
  if (Array.isArray(input)) return input.map(maskSensitiveData);
  if (typeof input === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, val] of Object.entries(input)) {
      if (SENSITIVE_KEYS.test(key)) {
        out[key] = typeof val === "string" ? maskSecret(val) : "••••••••";
      } else {
        out[key] = maskSensitiveData(val);
      }
    }
    return out;
  }
  return input;
}

/**
 * Decode JWT payload without verification (display only).
 * @param {string} token
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
