/**
 * RC9 — Business card OCR → AI pipeline orchestrator.
 *
 * Modes:
 * - manual: skip AI/OCR (caller handles form)
 * - ocr_only: vision extraction → field mapping
 * - ocr_ai: vision extraction → Qwen normalization → field mapping
 */

import { readCompressedImageAsDataUrl } from "@/utils/imageCompression";
import { uploadOcrScan } from "@/utils/assetPipeline";
import { storage } from "@/api/storageClient";
import { extractOcrScan, normalizeBusinessCardProfile } from "@/api/aiClient";
import { sanitizeOCRResult } from "@/utils/securitySanitizer";
import { createPipelineLogger, makePipelineError } from "@/pipeline/pipelineLogger";
import { mapToRegistrationFields, mapToOcrScannerFields } from "@/pipeline/fieldMapping";
import { safeJsonParse } from "@/utils/securitySanitizer";

/** @typedef {"manual"|"ocr_only"|"ocr_ai"} PipelineMode */
/** @typedef {"registration"|"scanner"|"onboarding"} PipelineTarget */

/**
 * @param {string} dataUrl
 * @param {string} [filename]
 * @returns {File}
 */
export function dataUrlToFile(dataUrl, filename = "business-card.jpg") {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header?.match(/:(.*?);/);
  const mime = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function extractStructuredResult(response) {
  if (!response?.success) {
    throw makePipelineError(
      response?.metadata?.stage || "ai_request",
      response?.error?.code || "AI_REQUEST_FAILED",
      response?.error?.message || "AI request failed.",
      { error: response?.error }
    );
  }

  const raw = response.result ?? response.raw?.result ?? response.raw;
  if (raw && typeof raw === "object" && raw.result && typeof raw.result === "object") {
    return raw.result;
  }
  if (raw && typeof raw === "object") return raw;

  const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
  const parsed = safeJsonParse(text, null);
  if (!parsed || typeof parsed !== "object") {
    throw makePipelineError(
      "json_parsing",
      "JSON_PARSE_FAILED",
      "AI response could not be parsed as JSON.",
      { preview: text.slice(0, 200) }
    );
  }
  return parsed;
}

/**
 * @param {Object} params
 * @param {File} [params.file]
 * @param {PipelineMode} [params.mode]
 * @param {"business_card"|"badge"} [params.scanType]
 * @param {string|null} [params.userId]
 * @param {boolean} [params.skipStorage]
 * @param {PipelineTarget} [params.target]
 * @param {(entry: import("@/pipeline/pipelineLogger").PipelineLogEntry) => void} [params.onLog]
 */
export async function runBusinessCardPipeline({
  file,
  mode = "ocr_ai",
  scanType = "business_card",
  userId = null,
  skipStorage = false,
  target = "registration",
  onLog,
}) {
  const runId = `rc9-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const logger = createPipelineLogger(runId, onLog);
  const started = Date.now();

  /** @type {Record<string, unknown>} */
  const metrics = {
    compressionMs: 0,
    storageUploadMs: 0,
    ocrMs: 0,
    aiMs: 0,
    fieldMappingMs: 0,
    ocrTokens: null,
    aiTokens: null,
    ocrModel: null,
    aiModel: null,
  };

  if (mode === "manual") {
    logger.log("pipeline", "skip", { message: "Manual registration — OCR/AI skipped." });
    return {
      success: true,
      mode,
      runId,
      profile: null,
      formFields: null,
      logs: logger.getEntries(),
      metrics,
      latencyMs: Date.now() - started,
    };
  }

  if (!file) {
    const err = makePipelineError("pipeline", "MISSING_FILE", "No image file provided.");
    logger.log("pipeline", "error", { code: err.code, message: err.message });
    return {
      success: false,
      mode,
      runId,
      error: { stage: err.stage, code: err.code, message: err.message },
      logs: logger.getEntries(),
      metrics,
      latencyMs: Date.now() - started,
    };
  }

  let imageUrl = null;
  let storagePath = null;
  let compressedDataUrl = null;

  // ── Stage 1: Compression ──────────────────────────────────────────────────
  const compressStart = Date.now();
  logger.log("compression", "start", { fileName: file.name, fileSize: file.size });

  try {
    compressedDataUrl = await readCompressedImageAsDataUrl(file);
    metrics.compressionMs = Date.now() - compressStart;
    logger.log("compression", "ok", {
      latencyMs: metrics.compressionMs,
      details: { dataUrlLength: compressedDataUrl.length },
    });
  } catch (error) {
    metrics.compressionMs = Date.now() - compressStart;
    const message = error instanceof Error ? error.message : String(error);
    logger.log("compression", "error", {
      latencyMs: metrics.compressionMs,
      code: "COMPRESSION_FAILED",
      message,
    });
    return failResult(mode, runId, logger, metrics, started, "compression", "COMPRESSION_FAILED", message);
  }

  // ── Stage 2: Storage upload (optional) ───────────────────────────────────
  if (!skipStorage && userId) {
    const uploadStart = Date.now();
    logger.log("storage_upload", "start", { userId });

    try {
      const compressedFile = dataUrlToFile(compressedDataUrl, file.name || "card.jpg");
      const upload = await uploadOcrScan(compressedFile, userId);
      storagePath = upload.file_url;
      const signed = await storage.getSignedUrl(storagePath);
      imageUrl = signed || storagePath;
      metrics.storageUploadMs = Date.now() - uploadStart;
      logger.log("storage_upload", "ok", {
        latencyMs: metrics.storageUploadMs,
        details: { storagePath, signedUrl: Boolean(signed) },
      });
    } catch (error) {
      metrics.storageUploadMs = Date.now() - uploadStart;
      const message = error instanceof Error ? error.message : String(error);
      logger.log("storage_upload", "error", {
        latencyMs: metrics.storageUploadMs,
        code: "STORAGE_UPLOAD_FAILED",
        message,
      });
      return failResult(
        mode,
        runId,
        logger,
        metrics,
        started,
        "storage_upload",
        "STORAGE_UPLOAD_FAILED",
        message
      );
    }
  } else {
    imageUrl = compressedDataUrl;
    logger.log("storage_upload", "skip", {
      message: skipStorage
        ? "Storage skipped (pre-auth or explicit flag)."
        : "Storage skipped (no userId).",
    });
  }

  // ── Stage 3: OCR extraction (vision) ─────────────────────────────────────
  const ocrStart = Date.now();
  logger.log("ocr_extraction", "start", { scanType, imageDelivery: skipStorage ? "data_url" : "signed_url" });

  let ocrJson;
  try {
    const ocrResponse = await extractOcrScan({
      scanType,
      imageUrl,
      pipelineStage: "ocr_extraction",
    });
    ocrJson = extractStructuredResult(ocrResponse);
    metrics.ocrMs = Date.now() - ocrStart;
    metrics.ocrTokens = ocrResponse.tokens ?? ocrResponse.usage?.total_tokens ?? null;
    metrics.ocrModel = ocrResponse.model;
    logger.log("ocr_extraction", "ok", {
      latencyMs: metrics.ocrMs,
      details: {
        fields: Object.keys(ocrJson),
        tokens: metrics.ocrTokens,
        model: metrics.ocrModel,
      },
    });
  } catch (error) {
    metrics.ocrMs = Date.now() - ocrStart;
    const stage = error?.stage || "ocr_extraction";
    const code = error?.code || "OCR_EXTRACTION_FAILED";
    const message = error instanceof Error ? error.message : String(error);
    logger.log("ocr_extraction", "error", { latencyMs: metrics.ocrMs, code, message });
    return failResult(mode, runId, logger, metrics, started, stage, code, message);
  }

  // ── Stage 4: JSON parsing validation ─────────────────────────────────────
  logger.log("json_parsing", "start", {});
  let profile = sanitizeOCRResult(ocrJson);
  if (!profile || typeof profile !== "object" || Object.keys(profile).length === 0) {
    logger.log("json_parsing", "error", {
      code: "OCR_JSON_EMPTY",
      message: "OCR returned an empty profile.",
    });
    return failResult(
      mode,
      runId,
      logger,
      metrics,
      started,
      "json_parsing",
      "OCR_JSON_EMPTY",
      "OCR returned an empty profile."
    );
  }
  logger.log("json_parsing", "ok", { details: { fieldCount: Object.keys(profile).length } });

  // ── Stage 5: Qwen normalization (ocr_ai only) ─────────────────────────────
  if (mode === "ocr_ai") {
    const aiStart = Date.now();
    logger.log("ai_request", "start", { provider: "openrouter", model: "qwen/qwen-2.5-vl-72b-instruct" });

    try {
      const aiResponse = await normalizeBusinessCardProfile(profile, {
        pipelineStage: "ai_normalization",
      });
      const normalized = extractStructuredResult(aiResponse);
      profile = sanitizeOCRResult(normalized);
      metrics.aiMs = Date.now() - aiStart;
      metrics.aiTokens = aiResponse.tokens ?? aiResponse.usage?.total_tokens ?? null;
      metrics.aiModel = aiResponse.model;
      logger.log("ai_response", "ok", {
        latencyMs: metrics.aiMs,
        details: {
          tokens: metrics.aiTokens,
          model: metrics.aiModel,
          normalizationNotes: profile.normalization_notes || null,
        },
      });
    } catch (error) {
      metrics.aiMs = Date.now() - aiStart;
      const code = error?.code || "AI_NORMALIZATION_FAILED";
      const message = error instanceof Error ? error.message : String(error);
      logger.log("ai_request", "error", { latencyMs: metrics.aiMs, code, message });
      return failResult(mode, runId, logger, metrics, started, "ai_normalization", code, message);
    }
  } else {
    logger.log("ai_request", "skip", { message: "OCR-only mode — AI normalization skipped." });
  }

  // ── Stage 6: Field mapping ────────────────────────────────────────────────
  const mapStart = Date.now();
  logger.log("field_mapping", "start", { target });

  let formFields;
  try {
    formFields =
      target === "scanner"
        ? mapToOcrScannerFields(profile)
        : mapToRegistrationFields(profile);
    metrics.fieldMappingMs = Date.now() - mapStart;
    logger.log("field_mapping", "ok", {
      latencyMs: metrics.fieldMappingMs,
      details: { mappedKeys: Object.keys(formFields) },
    });
  } catch (error) {
    metrics.fieldMappingMs = Date.now() - mapStart;
    const message = error instanceof Error ? error.message : String(error);
    logger.log("field_mapping", "error", {
      latencyMs: metrics.fieldMappingMs,
      code: "FIELD_MAPPING_FAILED",
      message,
    });
    return failResult(
      mode,
      runId,
      logger,
      metrics,
      started,
      "field_mapping",
      "FIELD_MAPPING_FAILED",
      message
    );
  }

  return {
    success: true,
    mode,
    runId,
    profile,
    formFields,
    storagePath,
    imageUrl: skipStorage ? null : imageUrl,
    logs: logger.getEntries(),
    metrics,
    latencyMs: Date.now() - started,
  };
}

function failResult(mode, runId, logger, metrics, started, stage, code, message) {
  return {
    success: false,
    mode,
    runId,
    error: { stage, code, message },
    logs: logger.getEntries(),
    metrics,
    latencyMs: Date.now() - started,
  };
}

export const PIPELINE_MODES = {
  MANUAL: "manual",
  OCR_ONLY: "ocr_only",
  OCR_AI: "ocr_ai",
};
