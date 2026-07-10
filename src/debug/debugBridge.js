/**
 * RC10.5 — Lightweight event bridge for subsystem instrumentation.
 * Near-zero cost when no listeners are registered.
 */

/** @typedef {"pipeline"|"ai"|"api"|"storage"|"error"|"log"} DebugEventType */

/** @type {Map<DebugEventType, Set<(payload: unknown) => void>>} */
const listeners = new Map();

/**
 * @param {DebugEventType} type
 * @param {(payload: unknown) => void} fn
 */
export function onDebugEvent(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type)?.delete(fn);
}

/**
 * @param {DebugEventType} type
 * @param {unknown} payload
 */
export function emitDebugEvent(type, payload) {
  const set = listeners.get(type);
  if (!set || set.size === 0) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch {
      /* ignore listener errors */
    }
  }
}
