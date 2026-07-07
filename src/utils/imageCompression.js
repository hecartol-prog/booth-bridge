const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_JPEG_QUALITY = 0.82;
const MAX_DATA_URL_LENGTH = 1_500_000;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function fitWithin(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Resize and compress an image file for OCR / AI upload.
 * Returns a JPEG data URL sized for gateway limits.
 */
export async function readCompressedImageAsDataUrl(file, options = {}) {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  let quality = options.quality ?? DEFAULT_JPEG_QUALITY;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxDimension);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");

    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.5) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error("Image is too large even after compression. Try a smaller photo.");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
