/**
 * Canonical Supabase Storage buckets and upload destination mapping.
 * Consumed by storageClient.js and assetPipeline.js — not by pages.
 */

export const BUCKETS = {
  ASSETS: "boothbridge-assets",
  MEDIA: "boothbridge-media",
  OCR: "boothbridge-ocr",
};

export const ALL_BUCKETS = Object.values(BUCKETS);

/** @typedef {'ocr'|'media'|'logo'|'product'|'catalog'|'event_branding'|'general'} UploadDestination */

/**
 * Sanitize filename for object storage keys.
 * @param {string} name
 */
export function sanitizeFilename(name) {
  const base = (name || "file").split(/[/\\]/).pop() || "file";
  return base.replace(/[^\w.\-()+@]/g, "_").slice(0, 200);
}

/**
 * @param {UploadDestination} destination
 * @param {{ userId?: string, companyId?: string, eventId?: string, filename: string }} ctx
 * @returns {{ bucket: string, path: string }}
 */
export function resolveUploadDestination(destination, ctx) {
  const filename = sanitizeFilename(ctx.filename);
  const userId = ctx.userId || "anonymous";

  switch (destination) {
    case "ocr":
      return { bucket: BUCKETS.OCR, path: `scans/${userId}/${filename}` };
    case "media":
      return { bucket: BUCKETS.MEDIA, path: `uploads/${userId}/${filename}` };
    case "logo":
      return { bucket: BUCKETS.MEDIA, path: `logos/${userId}/${filename}` };
    case "product":
      return { bucket: BUCKETS.MEDIA, path: `products/${userId}/${filename}` };
    case "catalog":
      if (ctx.companyId) {
        return {
          bucket: BUCKETS.ASSETS,
          path: `companies/${ctx.companyId}/catalogs/${filename}`,
        };
      }
      return { bucket: BUCKETS.ASSETS, path: `uploads/${userId}/catalogs/${filename}` };
    case "event_branding":
      return {
        bucket: BUCKETS.ASSETS,
        path: `events/${ctx.eventId || "unknown"}/branding/${filename}`,
      };
    case "general":
    default:
      return { bucket: BUCKETS.MEDIA, path: `uploads/${userId}/${filename}` };
  }
}

/**
 * Parse a stored file reference into bucket + path (Supabase) or legacy URI.
 * @param {string} fileRef
 * @param {{ bucket?: string }} [options]
 * @returns {{ kind: 'http', url: string } | { kind: 'storage', bucket: string, path: string } | { kind: 'legacy', uri: string }}
 */
export function parseFileRef(fileRef, options = {}) {
  if (!fileRef) return null;
  if (fileRef.startsWith("http://") || fileRef.startsWith("https://")) {
    return { kind: "http", url: fileRef };
  }

  for (const bucket of ALL_BUCKETS) {
    if (fileRef.startsWith(`${bucket}/`)) {
      return { kind: "storage", bucket, path: fileRef.slice(bucket.length + 1) };
    }
  }

  if (options.bucket) {
    return { kind: "storage", bucket: options.bucket, path: fileRef };
  }

  return { kind: "legacy", uri: fileRef };
}

/**
 * Canonical stored reference for Supabase uploads.
 * @param {string} bucket
 * @param {string} path
 */
export function toStorageRef(bucket, path) {
  return `${bucket}/${path}`;
}

// ── Path builders (canonical schema) ───────────────────────────────────────

export function eventBrandingPath(eventId, filename) {
  return `events/${eventId}/branding/${sanitizeFilename(filename)}`;
}

export function companyCatalogPath(companyId, filename) {
  return `companies/${companyId}/catalogs/${sanitizeFilename(filename)}`;
}
