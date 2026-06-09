/**
 * assetPipeline — deterministic object storage path schema + signed URL gateway.
 *
 * Folder structure enforced:
 *   boothbridge-assets/
 *   ├── events/[event_id]/branding/      ← banners, maps
 *   └── companies/[company_id]/catalogs/ ← PDFs, pricing, tech sheets
 *
 * TODAY:  Uses base44 UploadFile integration + CreateFileSignedUrl.
 * FUTURE: Swap upload/signedUrl internals to use Supabase Storage SDK.
 */

import { base44 } from "@/api/base44Client";

// ── Path builders ──────────────────────────────────────────────────────────

export function eventBrandingPath(eventId, filename) {
  return `events/${eventId}/branding/${filename}`;
}

export function companyCatalogPath(companyId, filename) {
  return `companies/${companyId}/catalogs/${filename}`;
}

// ── Upload helpers ─────────────────────────────────────────────────────────

/**
 * Upload a file and return { file_url, file_path }.
 * The returned file_url is a private URI — use getSignedUrl() before displaying.
 */
export async function uploadAsset(file) {
  const result = await base44.integrations.Core.UploadFile({ file });
  return { file_url: result.file_url };
}

/**
 * Get a short-lived (15 min) signed download URL for a private asset.
 * Never expose the raw file_url directly in UI — always call this first.
 *
 * @param {string} fileUri  The private file URI stored in the entity.
 * @returns {Promise<string>}  A time-bound URL safe for browser download.
 */
export async function getSignedUrl(fileUri, expiresInSeconds = 900) {
  if (!fileUri) return null;
  // If it's already a public HTTP URL (legacy data), return as-is
  if (fileUri.startsWith("http")) return fileUri;
  const result = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: expiresInSeconds,
  });
  return result?.signed_url || null;
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