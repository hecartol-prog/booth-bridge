/**
 * RC10.5 — Central debug state store (pub/sub).
 */

import { emitDebugEvent } from "@/debug/debugBridge";

/** @typedef {"PASS"|"RUNNING"|"FAILED"|"SKIP"|"IDLE"} StageStatus */

/**
 * @typedef {Object} OcrStageState
 * @property {StageStatus} status
 * @property {number|null} durationMs
 * @property {string|null} error
 * @property {Record<string, unknown>} meta
 */

/** @type {Record<string, OcrStageState>} */
const OCR_STAGE_KEYS = {
  image_selected: "Image selected",
  compression: "Compression",
  upload: "Upload",
  vision_ocr: "Vision OCR",
  normalization: "Normalization",
  validation: "Validation",
  ui: "UI",
};

const PIPELINE_STAGE_MAP = {
  image_selected: "image_selected",
  preprocessing: "compression",
  storage_upload: "upload",
  vision_extraction: "vision_ocr",
  ai_normalization: "normalization",
  structure_normalize: "normalization",
  validation: "validation",
  field_mapping: "ui",
  pipeline: "ui",
};

const MAX_API_LOG = 200;
const MAX_ERRORS = 100;
const MAX_LOGS = 500;

function defaultOcrStages() {
  /** @type {Record<string, OcrStageState>} */
  const stages = {};
  for (const key of Object.keys(OCR_STAGE_KEYS)) {
    stages[key] = { status: "IDLE", durationMs: null, error: null, meta: {} };
  }
  return stages;
}

/** @type {import("@/debug/debugStore").DebugState} */
const state = {
  ocrStages: defaultOcrStages(),
  ocrRunMeta: {
    imageSizeBefore: null,
    imageSizeAfter: null,
    compressionRatio: null,
    visionLatency: null,
    normalizationLatency: null,
  },
  ai: {
    enabled: true,
    provider: "supabase",
    model: null,
    visionModel: import.meta.env.VITE_RC10_VISION_MODEL || "qwen/qwen-2.5-vl-72b-instruct",
    textModel: import.meta.env.VITE_RC10_NORMALIZE_MODEL || "qwen/qwen-2.5-7b-instruct",
    lastLatency: null,
    avgLatency: null,
    latencies: [],
    tokenUsage: null,
    estimatedCost: null,
    lastError: null,
    lastRequest: null,
    lastResponseCode: null,
  },
  apiRequests: [],
  storage: {
    bucket: "boothbridge-ocr",
    uploadStatus: "idle",
    lastUpload: null,
    signedUrl: null,
    publicUrl: null,
    uploadLatency: null,
    lastUploadError: null,
  },
  database: {
    profileLoaded: false,
    companyLoaded: false,
    meetingsLoaded: false,
    notificationsLoaded: false,
    realtimeSubscriptions: 0,
    pendingMutations: 0,
    failedMutations: 0,
    retryQueue: 0,
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || "",
    connectionStatus: "unknown",
    latencyMs: null,
    realtimeConnected: false,
    channelCount: 0,
    storageReachable: null,
    databaseReachable: null,
    edgeFunctionsReachable: null,
    lastHealthCheck: null,
  },
  errors: [],
  logs: [],
  loginTimestamp: null,
  renderCount: 0,
};

/** @type {Set<() => void>} */
const subscribers = new Set();

export function getDebugState() {
  return state;
}

export function subscribeDebugStore(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notify() {
  for (const fn of subscribers) fn();
}

/**
 * @param {string} tag
 * @param {"debug"|"info"|"warn"|"error"} severity
 * @param {string} message
 * @param {Record<string, unknown>} [metadata]
 * @param {number} [duration]
 */
export function addDebugLog(tag, severity, message, metadata = {}, duration) {
  const entry = {
    timestamp: new Date().toISOString(),
    tag,
    severity,
    message,
    duration: duration ?? null,
    metadata,
  };
  state.logs.unshift(entry);
  if (state.logs.length > MAX_LOGS) state.logs.length = MAX_LOGS;
  emitDebugEvent("log", entry);
  notify();
}

/**
 * @param {import("@/debug/debugStore").DebugErrorEntry} entry
 */
export function addDebugError(entry) {
  state.errors.unshift(entry);
  if (state.errors.length > MAX_ERRORS) state.errors.length = MAX_ERRORS;
  emitDebugEvent("error", entry);
  addDebugLog("ERROR", "error", entry.message, {
    page: entry.page,
    component: entry.component,
    severity: entry.severity,
  });
  notify();
}

export function clearDebugErrors() {
  state.errors = [];
  notify();
}

/**
 * @param {import("@/debug/debugStore").ApiRequestEntry} entry
 */
export function addApiRequest(entry) {
  state.apiRequests.unshift(entry);
  if (state.apiRequests.length > MAX_API_LOG) state.apiRequests.length = MAX_API_LOG;
  emitDebugEvent("api", entry);
  notify();
}

/**
 * @param {import("@/pipeline/pipelineLogger").PipelineLogEntry} entry
 */
export function forwardPipelineLog(entry) {
  const stageKey = PIPELINE_STAGE_MAP[entry.stage];
  if (!stageKey) return;

  const status =
    entry.status === "start"
      ? "RUNNING"
      : entry.status === "ok"
        ? "PASS"
        : entry.status === "error"
          ? "FAILED"
          : "SKIP";

  const stage = state.ocrStages[stageKey];
  if (!stage) return;

  stage.status = status;
  if (entry.latencyMs != null) stage.durationMs = Number(entry.latencyMs);
  if (entry.message) stage.error = entry.status === "error" ? entry.message : null;
  if (entry.details) stage.meta = { ...stage.meta, ...entry.details };

  if (stageKey === "compression" || stageKey === "image_selected") {
    const details = /** @type {Record<string, unknown>} */ (entry.details || {});
    if (details.fileSize) state.ocrRunMeta.imageSizeBefore = Number(details.fileSize);
    if (details.originalBytes) state.ocrRunMeta.imageSizeBefore = Number(details.originalBytes);
    if (details.outputBytes) state.ocrRunMeta.imageSizeAfter = Number(details.outputBytes);
    if (details.compressionRatio) state.ocrRunMeta.compressionRatio = Number(details.compressionRatio);
  }

  if (stageKey === "vision_ocr" && entry.latencyMs) {
    state.ocrRunMeta.visionLatency = Number(entry.latencyMs);
  }
  if (stageKey === "normalization" && entry.latencyMs) {
    state.ocrRunMeta.normalizationLatency = Number(entry.latencyMs);
  }

  emitDebugEvent("pipeline", { stageKey, entry });
  addDebugLog("OCR", status === "FAILED" ? "error" : "info", `${stageKey}: ${entry.status}`, {
    stage: entry.stage,
    ...entry.details,
  }, entry.latencyMs);
  notify();
}

export function resetOcrPipeline() {
  state.ocrStages = defaultOcrStages();
  state.ocrRunMeta = {
    imageSizeBefore: null,
    imageSizeAfter: null,
    compressionRatio: null,
    visionLatency: null,
    normalizationLatency: null,
  };
  notify();
}

/**
 * @param {string} stageKey
 * @param {Partial<OcrStageState>} patch
 */
export function patchOcrStage(stageKey, patch) {
  if (!state.ocrStages[stageKey]) return;
  Object.assign(state.ocrStages[stageKey], patch);
  notify();
}

/**
 * @param {Record<string, unknown>} payload
 */
export function recordAiRequest(payload) {
  const latency = Number(payload.latency) || 0;
  state.ai.lastLatency = latency;
  state.ai.latencies.push(latency);
  if (state.ai.latencies.length > 50) state.ai.latencies.shift();
  state.ai.avgLatency =
    state.ai.latencies.reduce((a, b) => a + b, 0) / state.ai.latencies.length;

  if (payload.model) state.ai.model = String(payload.model);
  if (payload.provider) state.ai.provider = String(payload.provider);
  if (payload.usage) state.ai.tokenUsage = payload.usage;
  if (payload.success === false && payload.error) {
    state.ai.lastError = String(
      payload.error?.message || payload.error || "AI request failed"
    );
    state.ai.lastResponseCode = "error";
  } else {
    state.ai.lastResponseCode = "ok";
    state.ai.lastError = null;
  }
  state.ai.lastRequest = payload.requestSummary || payload.stage || "ai-request";

  emitDebugEvent("ai", payload);
  addDebugLog(
    "AI",
    payload.success === false ? "error" : "info",
    state.ai.lastRequest,
    { provider: state.ai.provider, model: state.ai.model },
    latency
  );
  notify();
}

/**
 * @param {Partial<typeof state.storage>} patch
 */
export function patchStorageState(patch) {
  Object.assign(state.storage, patch);
  emitDebugEvent("storage", patch);
  notify();
}

/**
 * @param {Partial<typeof state.supabase>} patch
 */
export function patchSupabaseState(patch) {
  Object.assign(state.supabase, patch);
  notify();
}

/**
 * @param {Partial<typeof state.database>} patch
 */
export function patchDatabaseState(patch) {
  Object.assign(state.database, patch);
  notify();
}

export function setLoginTimestamp(ts) {
  state.loginTimestamp = ts;
  notify();
}

export function incrementRenderCount() {
  state.renderCount += 1;
  notify();
}

export function getOcrStageLabels() {
  return OCR_STAGE_KEYS;
}
