/**
 * storageClient — file upload and signed URL abstraction.
 * Replaces base44.integrations.Core.UploadFile / CreateFileSignedUrl in Phase 2+.
 *
 * Phase 1: Base44 delegation only; not wired into pages or assetPipeline.
 */

import { base44 } from "@/api/base44Client";
import { isBase44 } from "@/config/backend";

const DEFAULT_BUCKET = "boothbridge-assets";

function supabaseNotReady(method) {
  throw new Error(
    `[storageClient] ${method} is not available until Phase 4. Use VITE_DATA_BACKEND=base44.`
  );
}

/**
 * Upload a file to storage.
 * @param {File|Blob} file
 * @param {{ bucket?: string, path?: string }} options
 * @returns {Promise<{ file_url: string, file_path?: string }>}
 */
export async function uploadFile(file, options = {}) {
  if (isBase44()) {
    const result = await base44.integrations.Core.UploadFile({ file });
    return {
      file_url: result.file_url,
      file_path: options.path || null,
    };
  }
  supabaseNotReady("uploadFile");
}

/**
 * Get a time-limited signed URL for a private asset.
 * @param {string} fileUri — stored URI or path
 * @param {{ bucket?: string, expiresIn?: number }} options
 * @returns {Promise<string|null>}
 */
export async function getSignedUrl(fileUri, options = {}) {
  if (!fileUri) return null;

  if (isBase44()) {
    if (fileUri.startsWith("http")) return fileUri;
    const expiresIn = options.expiresIn ?? 900;
    const result = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: expiresIn,
    });
    return result?.signed_url || null;
  }
  supabaseNotReady("getSignedUrl");
}

/**
 * Public URL for assets in public buckets (Supabase phase).
 * Base44: returns http URLs as-is, otherwise null.
 */
export function getPublicUrl(filePath, bucket = DEFAULT_BUCKET) {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  if (isBase44()) return null;
  supabaseNotReady("getPublicUrl");
}

export const storage = {
  uploadFile,
  getSignedUrl,
  getPublicUrl,
  DEFAULT_BUCKET,
};
