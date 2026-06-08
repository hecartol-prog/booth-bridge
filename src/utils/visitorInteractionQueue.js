/**
 * Visitor Interaction Queue — queues offline visitor actions (save booth,
 * save product, download catalog, submit RFI) using the same IndexedDB/
 * localStorage pattern as the scan queue.
 */

const DB_NAME = "boothbridge_offline";
const STORE = "visitor_interactions";
const LS_KEY = "boothbridge_offline_interactions";

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2); // bump version to add new store
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("scan_queue")) {
        db.createObjectStore("scan_queue", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbAdd(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── localStorage fallback ──────────────────────────────────────────────────

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsSet(q) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(q)); } catch (_) {}
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Action types that can be queued.
 */
export const VISITOR_ACTIONS = {
  SAVE_BOOTH: "save_booth",
  SAVE_PRODUCT: "save_product",
  DOWNLOAD_CATALOG: "download_catalog",
  SUBMIT_RFI: "submit_rfi",
};

/**
 * Enqueue a visitor interaction for deferred sync.
 * @param {object} payload
 */
export async function enqueueVisitorAction(payload) {
  const record = { ...payload, queuedAt: new Date().toISOString() };
  try {
    await idbAdd(record);
  } catch (_) {
    const q = lsGet();
    q.push({ ...record, id: Date.now() });
    lsSet(q);
  }
}

export async function getPendingVisitorActions() {
  try {
    return await idbGetAll();
  } catch (_) {
    return lsGet();
  }
}

export async function removeSyncedVisitorAction(id) {
  try {
    await idbDelete(id);
  } catch (_) {
    lsSet(lsGet().filter((r) => r.id !== id));
  }
}

export async function getPendingVisitorCount() {
  const items = await getPendingVisitorActions();
  return items.length;
}