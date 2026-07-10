/**
 * RC10 — Universal document intelligence pipeline orchestrator.
 * Modular stages reusable for business cards, badges, catalogs, brochures, etc.
 */

import { preprocessBusinessCardImageSafe } from "@/utils/imagePreprocessing";
import { uploadOcrScan } from "@/utils/assetPipeline";
import { storage } from "@/api/storageClient";
import {
  extractRc10VisionText,
  normalizeRc10BusinessCard,
  extractOcrScan,
} from "@/api/aiClient";
import { sanitizeOCRResult, safeJsonParse } from "@/utils/securitySanitizer";
import { createPipelineLogger, makePipelineError } from "@/pipeline/pipelineLogger";
import {
  validateStructuredProfile,
  flattenStructuredProfile,
} from "@/pipeline/documentIntelligence/entityValidation";
import { mapToRegistrationFields, mapToOcrScannerFields } from "@/pipeline/fieldMapping";
import { ocrScannerBadgePrompt } from "@/ai/prompts/businessCard/ocrScanner";

/** @typedef {"manual"|"ocr_only"|"ocr_ai"} PipelineMode */
/** @typedef {"registration"|"scanner"|"onboarding"} PipelineTarget */
/** @typedef {"business_card"|"badge"} DocumentType */

export const RC10_VISION_MODEL =
  import.meta.env.VITE_RC10_VISION_MODEL || "qwen/qwen-2.5-vl-72b-instruct";
export const RC10_NORMALIZE_MODEL =
  import.meta.env.VITE_RC10_NORMALIZE_MODEL || "qwen/qwen-2.5-72b-instruct";

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

function legacyFlatFromVision(visionJson) {
  return sanitizeOCRResult({
    full_text: visionJson.full_text,
    ...Object.fromEntries(
      (visionJson.text_blocks || []).map((b, i) => [`block_${i}`, b.text])
    ),
  });
}

/**
 * @param {Object} params
 * @param {File} [params.file]
 * @param {PipelineMode} [params.mode]
 * @param {DocumentType} [params.documentType]
 * @param {string|null} [params.userId]
 * @param {boolean} [params.skipStorage]
 * @param {boolean} [params.storageFallback] Continue OCR with inline image when upload fails.
 * @param {PipelineTarget} [params.target]
 * @param {(entry: import("@/pipeline/pipelineLogger").PipelineLogEntry) => void} [params.onLog]
 */
export async function runDocumentIntelligencePipeline({
  file,
  mode = "ocr_ai",
  documentType = "business_card",
  userId = null,
  skipStorage = false,
  storageFallback = false,
  target = "registration",
  onLog,
}) {
  const runId = `rc10-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const logger = createPipelineLogger(runId, onLog, "rc10-pipeline");
  const started = Date.now();

  /** @type {Record<string, unknown>} */
  const metrics = {
    preprocessingMs: 0,
    storageUploadMs: 0,
    visionMs: 0,
    normalizeMs: 0,
    validationMs: 0,
    fieldMappingMs: 0,
    visionTokens: null,
    normalizeTokens: null,
    visionModel: RC10_VISION_MODEL,
    normalizeModel: RC10_NORMALIZE_MODEL,
    preprocessing: null,
  };

  if (mode === "manual") {
    logger.log("pipeline", "skip", { message: "Manual mode — pipeline skipped." });
    return {
      success: true,
      mode,
      runId,
      profile: null,
      structuredProfile: null,
      formFields: null,
      fieldConfidence: null,
      validationFlags: null,
      logs: logger.getEntries(),
      metrics,
      latencyMs: Date.now() - started,
    };
  }

  if (!file) {
    const err = makePipelineError("pipeline", "MISSING_FILE", "No image file provided.");
    logger.log("pipeline", "error", { code: "MISSING_FILE", message: err.message });
    return failResult(mode, runId, logger, metrics, started, "pipeline", "MISSING_FILE", err.message);
  }

  logger.log("image_selected", "ok", {
    latencyMs: 0,
    details: { fileName: file.name, fileSize: file.size },
  });

  let imageUrl = null;
  let storagePath = null;
  let processedDataUrl = null;

  // ── Stage 1: Image preprocessing ───────────────────────────────────────────
  const preprocessStart = Date.now();
  logger.log("preprocessing", "start", { fileName: file.name, fileSize: file.size });

  try {
    const preprocessed = await preprocessBusinessCardImageSafe(file);
    processedDataUrl = preprocessed.dataUrl;
    metrics.preprocessingMs = Date.now() - preprocessStart;
    metrics.preprocessing = preprocessed.metrics;
    logger.log("preprocessing", "ok", {
      latencyMs: metrics.preprocessingMs,
      details: preprocessed.metrics,
    });
  } catch (error) {
    metrics.preprocessingMs = Date.now() - preprocessStart;
    const message = error instanceof Error ? error.message : String(error);
    logger.log("preprocessing", "error", { code: "PREPROCESSING_FAILED", message });
    return failResult(
      mode,
      runId,
      logger,
      metrics,
      started,
      "preprocessing",
      "PREPROCESSING_FAILED",
      message
    );
  }

  // ── Stage 2: Storage upload ───────────────────────────────────────────────
  if (!skipStorage && userId) {
    const uploadStart = Date.now();
    logger.log("storage_upload", "start", { userId });
    try {
      const processedFile = dataUrlToFile(processedDataUrl, file.name || "card.jpg");
      const upload = await uploadOcrScan(processedFile, userId);
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
      logger.log("storage_upload", "error", { code: "STORAGE_UPLOAD_FAILED", message });
      if (storageFallback) {
        imageUrl = processedDataUrl;
        logger.log("storage_upload", "skip", {
          message: "Continuing with inline image after storage upload failure.",
        });
      } else {
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
    }
  } else {
    imageUrl = processedDataUrl;
    logger.log("storage_upload", "skip", { message: "Storage skipped." });
  }

  // ── Stage 3: Vision extraction (Stage 1 AI) ───────────────────────────────
  const visionStart = Date.now();
  logger.log("vision_extraction", "start", { documentType, model: RC10_VISION_MODEL });

  let visionJson;
  try {
    if (documentType === "badge") {
      const badgeResponse = await extractOcrScan({
        scanType: "badge",
        imageUrl,
        pipelineStage: "vision_extraction",
        model: RC10_VISION_MODEL,
        prompt: ocrScannerBadgePrompt(),
      });
      const badgeFlat = extractStructuredResult(badgeResponse);
      visionJson = {
        full_text: JSON.stringify(badgeFlat),
        text_blocks: Object.entries(badgeFlat).map(([k, v]) => ({
          text: `${k}: ${v}`,
          region: "body",
        })),
        languages_detected: [],
        layout_notes: "badge",
        _badge_flat: badgeFlat,
      };
      metrics.visionMs = Date.now() - visionStart;
      metrics.visionTokens = badgeResponse.tokens ?? badgeResponse.usage?.total_tokens ?? null;
    } else {
      const visionResponse = await extractRc10VisionText({
        imageUrl,
        model: RC10_VISION_MODEL,
        pipelineStage: "vision_extraction",
      });
      visionJson = extractStructuredResult(visionResponse);
      metrics.visionMs = Date.now() - visionStart;
      metrics.visionTokens = visionResponse.tokens ?? visionResponse.usage?.total_tokens ?? null;
    }

    logger.log("vision_extraction", "ok", {
      latencyMs: metrics.visionMs,
      details: {
        textLength: visionJson.full_text?.length || 0,
        blocks: visionJson.text_blocks?.length || 0,
        tokens: metrics.visionTokens,
      },
    });
  } catch (error) {
    metrics.visionMs = Date.now() - visionStart;
    const stage = error?.stage || "vision_extraction";
    const code = error?.code || "VISION_EXTRACTION_FAILED";
    const message = error instanceof Error ? error.message : String(error);
    logger.log("vision_extraction", "error", { code, message });
    return failResult(mode, runId, logger, metrics, started, stage, code, message);
  }

  // ── Stage 4: LLM normalization (Stage 2 AI) ─────────────────────────────
  let structuredProfile = null;
  let validationFlags = {};
  let profile = legacyFlatFromVision(visionJson);

  if (mode === "ocr_ai" && documentType === "business_card") {
    const normalizeStart = Date.now();
    logger.log("ai_normalization", "start", { model: RC10_NORMALIZE_MODEL });

    try {
      const normalizeResponse = await normalizeRc10BusinessCard(visionJson, {
        model: RC10_NORMALIZE_MODEL,
        pipelineStage: "ai_normalization",
      });
      structuredProfile = extractStructuredResult(normalizeResponse);
      metrics.normalizeMs = Date.now() - normalizeStart;
      metrics.normalizeTokens =
        normalizeResponse.tokens ?? normalizeResponse.usage?.total_tokens ?? null;

      const validated = validateStructuredProfile(structuredProfile);
      structuredProfile = validated.profile;
      validationFlags = validated.flags;
      metrics.validationMs = validated.validationMs;

      const { flat } = flattenStructuredProfile(structuredProfile);
      profile = sanitizeOCRResult(flat);

      logger.log("ai_normalization", "ok", {
        latencyMs: metrics.normalizeMs,
        details: {
          tokens: metrics.normalizeTokens,
          validationFlags: Object.keys(validationFlags),
        },
      });
    } catch (error) {
      metrics.normalizeMs = Date.now() - normalizeStart;
      const code = error?.code || "AI_NORMALIZATION_FAILED";
      const message = error instanceof Error ? error.message : String(error);
      logger.log("ai_normalization", "error", { code, message });
      return failResult(
        mode,
        runId,
        logger,
        metrics,
        started,
        "ai_normalization",
        code,
        message
      );
    }
  } else if (documentType === "badge" && visionJson._badge_flat) {
    profile = sanitizeOCRResult(visionJson._badge_flat);
    logger.log("ai_normalization", "skip", { message: "Badge uses legacy flat extraction." });
  } else {
    logger.log("ai_normalization", "skip", { message: "ocr_only mode — normalization skipped." });
  }

  // ── Stage 5: Field mapping ────────────────────────────────────────────────
  const mapStart = Date.now();
  logger.log("field_mapping", "start", { target });

  let formFields = /** @type {Record<string, unknown>} */ ({});
  let fieldConfidence = null;

  try {
    if (structuredProfile) {
      const { flat, fieldConfidence: fc } = flattenStructuredProfile(structuredProfile);
      fieldConfidence = fc;
      profile = sanitizeOCRResult(flat);
    }

    formFields =
      target === "scanner"
        ? mapToOcrScannerFields(profile, fieldConfidence)
        : mapToRegistrationFields(profile, fieldConfidence);

    if (fieldConfidence) {
      formFields.fieldConfidence = fieldConfidence;
    }
    if (Object.keys(validationFlags).length) {
      formFields.validationFlags = validationFlags;
    }

    metrics.fieldMappingMs = Date.now() - mapStart;
    logger.log("field_mapping", "ok", {
      latencyMs: metrics.fieldMappingMs,
      details: { mappedKeys: Object.keys(formFields) },
    });
  } catch (error) {
    metrics.fieldMappingMs = Date.now() - mapStart;
    const message = error instanceof Error ? error.message : String(error);
    logger.log("field_mapping", "error", { code: "FIELD_MAPPING_FAILED", message });
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
    structuredProfile,
    formFields,
    fieldConfidence,
    validationFlags,
    visionRaw: visionJson,
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

/** Backward-compatible alias for existing importers. */
export async function runBusinessCardPipeline(params) {
  return runDocumentIntelligencePipeline({
    ...params,
    documentType: params.scanType || params.documentType || "business_card",
  });
}

export { runDocumentIntelligencePipeline as default };
