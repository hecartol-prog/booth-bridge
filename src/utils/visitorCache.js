/**
 * Visitor Cache — stores page-level data snapshots for offline fallback.
 * Uses localStorage with structured keys so pages render cached data when offline.
 */

const PREFIX = "boothbridge_visitor_cache";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(scope) {
  return `${PREFIX}:${scope}`;
}

/**
 * Save a data snapshot for a given scope.
 * @param {string} scope  e.g. "events", "exhibitors", "booth:userId"
 * @param {any}    data
 */
export function cacheWrite(scope, data) {
  try {
    const entry = { data, savedAt: Date.now() };
    localStorage.setItem(cacheKey(scope), JSON.stringify(entry));
  } catch (_) {
    // Storage quota exceeded — silently skip
  }
}

/**
 * Read a cached snapshot. Returns null if missing or too old.
 * @param {string} scope
 * @returns {any|null}
 */
export function cacheRead(scope) {
  try {
    const raw = localStorage.getItem(cacheKey(scope));
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > MAX_AGE_MS) return null;
    return data;
  } catch (_) {
    return null;
  }
}

/**
 * Check whether we have any cached data for a scope (regardless of age).
 */
export function hasCachedData(scope) {
  try {
    return !!localStorage.getItem(cacheKey(scope));
  } catch (_) {
    return false;
  }
}