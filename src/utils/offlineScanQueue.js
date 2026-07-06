/**
 * Offline Scan Queue — IndexedDB-backed with localStorage fallback.
 * Stores scanned QR payloads when offline and syncs them when back online.
 */

const DB_NAME = "boothbridge_offline";
const STORE_NAME = "scan_queue";
const LS_KEY = "boothbridge_offline_scans";

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const request = /** @type {any} */ (e.target);
      const db = /** @type {IDBDatabase} */ (request.result);
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbAdd(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── localStorage fallback ──────────────────────────────────────────────────

function lsGetQueue() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSaveQueue(queue) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
  } catch (_) {}
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Enqueue a scan payload for deferred sync.
 * @param {object} payload – { targetId, targetRole, scannedByUserId, scannedByName, timestamp, eventContext }
 */
export async function enqueueScan(payload) {
  const record = { ...payload, queuedAt: new Date().toISOString(), synced: false };
  try {
    await idbAdd(record);
  } catch (_) {
    // IDB unavailable — fall back to localStorage
    const queue = lsGetQueue();
    queue.push({ ...record, id: Date.now() });
    lsSaveQueue(queue);
  }
}

/**
 * Return all pending (unsynced) scans.
 */
export async function getPendingScans() {
  try {
    const all = await idbGetAll();
    return all.filter((r) => !r.synced);
  } catch (_) {
    return lsGetQueue().filter((r) => !r.synced);
  }
}

/**
 * Mark a scan as synced and remove it from the queue.
 * @param {number|string} id
 */
export async function removeSyncedScan(id) {
  try {
    await idbDelete(id);
  } catch (_) {
    const queue = lsGetQueue().filter((r) => r.id !== id);
    lsSaveQueue(queue);
  }
}

/**
 * Count of pending offline scans (for badge display).
 */
export async function getPendingCount() {
  const items = await getPendingScans();
  return items.length;
}