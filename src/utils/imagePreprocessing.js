/**
 * RC10 — Enterprise image preprocessing for document OCR.
 * Optimizes business card photos for vision models while preserving text legibility.
 */

const DEFAULT_MAX_DIMENSION = 2560;
const TARGET_MAX_BYTES = 1_000_000;
const MIN_JPEG_QUALITY = 0.68;
const START_JPEG_QUALITY = 0.9;
/** Skip pixel-level ops above this area (mobile canvas/memory limits). */
const MAX_ENHANCE_PIXELS = 2_500_000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through */
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load image"));
      el.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fitWithin(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height, scale: 1 };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scale,
  };
}

function drawToCanvas(bitmap, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not process image");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, ctx };
}

/** Normalize brightness/contrast while preserving color for logos. */
function enhanceContrast(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  let minL = 255;
  let maxL = 0;

  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }

  const range = maxL - minL;
  if (range < 20) return;

  const stretch = 255 / range;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      data[i + c] = clamp((data[i + c] - minL) * stretch, 0, 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Mild unsharp mask — preserves small glyphs. */
function sharpen(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src);
  const w = width;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += src[idx] * kernel[ki];
            ki += 1;
          }
        }
        const outIdx = (y * w + x) * 4 + c;
        out[outIdx] = clamp(sum, 0, 255);
      }
    }
  }

  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

/** Lift near-white background noise without crushing text. */
function cleanupBackground(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (avg > 245) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyEnhancements(ctx, width, height, steps) {
  const pixels = width * height;
  if (pixels > MAX_ENHANCE_PIXELS) {
    steps.push("enhancement_skipped_size");
    return;
  }

  try {
    enhanceContrast(ctx, width, height);
    steps.push("contrast_enhancement");
    cleanupBackground(ctx, width, height);
    steps.push("background_cleanup");
    if (pixels <= 1_500_000) {
      sharpen(ctx, width, height);
      steps.push("adaptive_sharpening");
    } else {
      steps.push("sharpen_skipped_size");
    }
  } catch (error) {
    steps.push("enhancement_skipped_error");
    console.warn("[imagePreprocessing] enhancement skipped:", error);
  }
}

/**
 * Lightweight fallback for camera photos when full preprocessing fails.
 * EXIF-aware resize + JPEG only (no pixel shaders).
 */
export async function preprocessBusinessCardImageLight(file, options = {}) {
  const maxDimension = options.maxDimension ?? 2048;
  const targetMaxBytes = options.targetMaxBytes ?? TARGET_MAX_BYTES;
  const steps = ["light_mode"];

  const started = Date.now();
  const bitmap = await loadBitmap(file);
  steps.push("exif_orientation");

  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const { width, height } = fitWithin(originalWidth, originalHeight, maxDimension);
  if (width !== originalWidth || height !== originalHeight) steps.push("resize");

  const { canvas, ctx } = drawToCanvas(bitmap, width, height);
  bitmap.close?.();

  let quality = options.quality ?? 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  let outputBytes = estimateDataUrlBytes(dataUrl);

  while (outputBytes > targetMaxBytes && quality > MIN_JPEG_QUALITY) {
    quality = Math.round((quality - 0.05) * 100) / 100;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    outputBytes = estimateDataUrlBytes(dataUrl);
    if (!steps.includes("quality_reduction")) steps.push("quality_reduction");
  }

  if (outputBytes > targetMaxBytes) {
    throw new Error("Image is too large. Try a closer photo or use gallery upload.");
  }

  return {
    dataUrl,
    metrics: {
      preprocessingMs: Date.now() - started,
      originalBytes: file.size,
      outputBytes,
      originalWidth,
      originalHeight,
      outputWidth: width,
      outputHeight: height,
      jpegQuality: quality,
      steps,
      mode: "light",
    },
  };
}
function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

/**
 * RC10 business card preprocessing pipeline.
 * @param {File} file
 * @param {Object} [options]
 * @returns {Promise<{ dataUrl: string, metrics: Record<string, unknown> }>}
 */
export async function preprocessBusinessCardImage(file, options = {}) {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const targetMaxBytes = options.targetMaxBytes ?? TARGET_MAX_BYTES;
  const steps = [];

  const started = Date.now();
  const bitmap = await loadBitmap(file);
  steps.push("exif_orientation");

  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  const { width, height, scale } = fitWithin(originalWidth, originalHeight, maxDimension);
  if (scale < 1) steps.push("resize");

  const { canvas, ctx } = drawToCanvas(bitmap, width, height);
  bitmap.close?.();

  applyEnhancements(ctx, width, height, steps);

  let quality = options.quality ?? START_JPEG_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  let outputBytes = estimateDataUrlBytes(dataUrl);

  while (outputBytes > targetMaxBytes && quality > MIN_JPEG_QUALITY) {
    quality = Math.round((quality - 0.04) * 100) / 100;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    outputBytes = estimateDataUrlBytes(dataUrl);
    if (!steps.includes("quality_reduction")) steps.push("quality_reduction");
  }

  if (outputBytes > targetMaxBytes) {
    throw new Error(
      "Image is too large after preprocessing. Try a closer photo or lower resolution."
    );
  }

  return {
    dataUrl,
    metrics: {
      preprocessingMs: Date.now() - started,
      originalBytes: file.size,
      outputBytes,
      originalWidth,
      originalHeight,
      outputWidth: width,
      outputHeight: height,
      jpegQuality: quality,
      steps,
      compressionRatio: file.size > 0 ? Number((outputBytes / file.size).toFixed(3)) : null,
    },
  };
}

/** Try full preprocessing, fall back to light mode for camera/memory edge cases. */
export async function preprocessBusinessCardImageSafe(file, options = {}) {
  try {
    return await preprocessBusinessCardImage(file, options);
  } catch (error) {
    console.warn("[imagePreprocessing] full preprocess failed, using light mode:", error);
    return preprocessBusinessCardImageLight(file, options);
  }
}

/** Backward-compatible alias used by RC9 callers. */
export async function readCompressedImageAsDataUrl(file, options = {}) {
  const { dataUrl } = await preprocessBusinessCardImageSafe(file, options);
  return dataUrl;
}
