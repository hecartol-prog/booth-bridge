/**
 * assetPipeline — deterministic object storage path schema + signed URL gateway.
 *
 * All uploads route through storageClient with canonical bucket mapping.
 * Pages use these helpers — never backend-specific storage APIs.
 */

import { storage } from "@/api/storageClient";
import {
  BUCKETS,
  eventBrandingPath,
  companyCatalogPath,
} from "@/config/storageBuckets";

export { eventBrandingPath, companyCatalogPath, BUCKETS };

// ── Destination-aware upload helpers ─────────────────────────────────────────

async function uploadWithDestination(destination, file, ctx = {}) {
  const { file_url, file_path, bucket } = await storage.upload(file, {
    destination,
    ...ctx,
  });
  return { file_url, file_path, bucket };
}

/** OCR / badge scan images → boothbridge-ocr */
export function uploadOcrScan(file, userId) {
  return uploadWithDestination("ocr", file, { userId });
}

/** Admin media library → boothbridge-media */
export function uploadMedia(file, userId) {
  return uploadWithDestination("media", file, { userId });
}

/** Company / exhibitor logos → boothbridge-media */
export function uploadCompanyLogo(file, userId) {
  return uploadWithDestination("logo", file, { userId });
}

/** Product images → boothbridge-media */
export function uploadProductImage(file, userId) {
  return uploadWithDestination("product", file, { userId });
}

/** Catalog PDFs / documents → boothbridge-assets */
export function uploadCatalog(file, { userId, companyId } = {}) {
  return uploadWithDestination("catalog", file, { userId, companyId });
}

/** Event banners / maps → boothbridge-assets */
export function uploadEventBranding(file, { eventId, userId } = {}) {
  return uploadWithDestination("event_branding", file, { eventId, userId });
}

/**
 * Upload a file and return { file_url }.
 * The returned file_url is a private URI — use getSignedUrl() before displaying.
 */
export async function uploadAsset(file, options = {}) {
  const result = await storage.upload(file, options);
  return { file_url: result.file_url, file_path: result.file_path };
}

/**
 * Get a short-lived (15 min) signed download URL for a private asset.
 * Never expose the raw file_url directly in UI — always call this first.
 *
 * @param {string} fileUri  The private file URI stored in the entity.
 * @returns {Promise<string|null>}  A time-bound URL safe for browser download.
 */
export async function getSignedUrl(fileUri, expiresInSeconds = 900) {
  if (!fileUri) return null;
  return storage.getSignedUrl(fileUri, { expiresIn: expiresInSeconds });
}

/**
 * Resolve a stored file reference to a displayable URL (signed when private).
 */
export async function resolveDisplayUrl(fileUri, expiresInSeconds = 900) {
  return getSignedUrl(fileUri, expiresInSeconds);
}

/**
 * Trigger a browser download of a catalog asset via a signed URL.
 * Increments download_count on the CatalogItem entity after opening.
 *
 * @param {object} catalog   CatalogItem entity record
 * @param {Function} onCount  Callback to persist incremented count
 */
export async function downloadCatalog(catalog, onCount) {
  const url = await getSignedUrl(catalog.file_url);
  if (!url) return;
  window.open(url, "_blank");
  if (onCount) onCount(catalog.id, (catalog.download_count || 0) + 1);
}

// ── Asset registry entry builder ───────────────────────────────────────────
// Produces a registry-ready metadata object matching the PostgreSQL schema.

export function buildAssetRegistryEntry({
  companyId,
  eventId,
  filePath,
  mimeType,
  fileSizeBytes,
  fileUrl,
}) {
  return {
    company_id: companyId || null,
    event_id: eventId || null,
    file_path: filePath,
    mime_type: mimeType || "application/octet-stream",
    file_size_bytes: fileSizeBytes || 0,
    file_url: fileUrl,
    download_count: 0,
  };
}
