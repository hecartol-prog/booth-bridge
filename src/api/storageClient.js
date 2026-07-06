/**
 * storageClient — file storage abstraction (Phase 7.4C).
 *
 * Routes through Base44 when VITE_DATA_BACKEND=base44 (default).
 * Routes through Supabase Storage when VITE_DATA_BACKEND=supabase.
 *
 * Pages and assetPipeline import this module only — never base44.integrations.Core directly.
 */

import { base44 } from "@/api/base44Client";
import { isBase44 } from "@/config/backend";
import {
  BUCKETS,
  resolveUploadDestination,
  parseFileRef,
} from "@/config/storageBuckets";
import * as supabaseStorage from "@/api/supabaseStorage";

const DEFAULT_BUCKET = BUCKETS.ASSETS;

function base44NotSupported(method) {
  throw new Error(
    `[storageClient] ${method} is not supported on the Base44 backend`
  );
}

/**
 * @param {File|Blob} file
 * @param {{
 *   bucket?: string,
 *   path?: string,
 *   destination?: import('@/config/storageBuckets').UploadDestination,
 *   userId?: string,
 *   companyId?: string,
 *   eventId?: string,
 *   upsert?: boolean,
 *   contentType?: string,
 *   filename?: string,
 * }} [options]
 * @returns {Promise<{ file_url: string, file_path?: string, bucket?: string }>}
 */
export async function upload(file, options = {}) {
  if (isBase44()) {
    if (!(file instanceof File)) {
      throw new Error("[storageClient] Base44 upload requires a File instance");
    }
    const result = await base44.integrations.Core.UploadFile({ file });
    return {
      file_url: result.file_url,
      file_path: options.path || null,
      bucket: options.bucket || null,
    };
  }

  let bucket = options.bucket;
  let path = options.path;

  if (!bucket || !path) {
    const destination = options.destination || "general";
    const filename =
      file instanceof File ? file.name : options.filename || `upload-${Date.now()}`;
    const resolved = resolveUploadDestination(destination, {
      userId: options.userId,
      companyId: options.companyId,
      eventId: options.eventId,
      filename,
    });
    bucket = bucket || resolved.bucket;
    path = path || resolved.path;
  }

  return supabaseStorage.supabaseUpload(file, {
    bucket,
    path,
    upsert: options.upsert,
    contentType: options.contentType,
  });
}

/** @alias upload */
export async function uploadFile(file, options = {}) {
  return upload(file, options);
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string, expiresIn?: number }} [options]
 * @returns {Promise<string|null>}
 */
export async function getSignedUrl(fileRef, options = {}) {
  if (!fileRef) return null;

  const parsed = parseFileRef(fileRef, options);
  if (parsed?.kind === "http") return parsed.url;

  if (isBase44()) {
    const expiresIn = options.expiresIn ?? 900;
    const result = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: fileRef,
      expires_in: expiresIn,
    });
    const signed = /** @type {{ signed_url?: string } | null} */ (result);
    return signed?.signed_url || null;
  }

  return supabaseStorage.supabaseGetSignedUrl(fileRef, options);
}

/**
 * @param {string} filePath
 * @param {string} [bucket]
 * @returns {string|null}
 */
export function getPublicUrl(filePath, bucket = DEFAULT_BUCKET) {
  if (!filePath) return null;
  const parsed = parseFileRef(filePath, { bucket });
  if (parsed?.kind === "http") return parsed.url;
  if (isBase44()) return null;
  return supabaseStorage.supabaseGetPublicUrl(filePath, bucket);
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} [options]
 * @returns {Promise<Blob>}
 */
export async function download(fileRef, options = {}) {
  if (isBase44()) {
    const url = await getSignedUrl(fileRef, options);
    if (!url) throw new Error("[storageClient] download: could not resolve URL");
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("[storageClient] download failed");
    return resp.blob();
  }
  return supabaseStorage.supabaseDownload(fileRef, options);
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} [options]
 */
export async function remove(fileRef, options = {}) {
  if (isBase44()) base44NotSupported("remove");
  return supabaseStorage.supabaseRemove(fileRef, options);
}

/**
 * @param {{ bucket: string, path?: string, limit?: number, offset?: number }} options
 */
export async function list(options) {
  if (isBase44()) base44NotSupported("list");
  return supabaseStorage.supabaseList(options);
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} [options]
 */
export async function exists(fileRef, options = {}) {
  if (!fileRef) return false;
  const parsed = parseFileRef(fileRef, options);
  if (parsed?.kind === "http") return true;

  if (isBase44()) {
    try {
      const url = await getSignedUrl(fileRef, options);
      return !!url;
    } catch {
      return false;
    }
  }

  return supabaseStorage.supabaseExists(fileRef, options);
}

/**
 * @param {string} bucket
 * @param {string} folderPath
 */
export async function createFolder(bucket, folderPath) {
  if (isBase44()) base44NotSupported("createFolder");
  return supabaseStorage.supabaseCreateFolder(bucket, folderPath);
}

/**
 * @param {string} bucket
 * @param {string} folderPath
 */
export async function deleteFolder(bucket, folderPath) {
  if (isBase44()) base44NotSupported("deleteFolder");
  return supabaseStorage.supabaseDeleteFolder(bucket, folderPath);
}

/**
 * @param {string} fileRef
 * @param {string} destPath
 * @param {{ bucket?: string }} [options]
 */
export async function copy(fileRef, destPath, options = {}) {
  if (isBase44()) base44NotSupported("copy");
  return supabaseStorage.supabaseCopy(fileRef, destPath, options);
}

/**
 * @param {string} fileRef
 * @param {string} destPath
 * @param {{ bucket?: string }} [options]
 */
export async function move(fileRef, destPath, options = {}) {
  if (isBase44()) base44NotSupported("move");
  return supabaseStorage.supabaseMove(fileRef, destPath, options);
}

export const storage = {
  upload,
  uploadFile,
  download,
  remove,
  list,
  getSignedUrl,
  getPublicUrl,
  exists,
  createFolder,
  deleteFolder,
  copy,
  move,
  DEFAULT_BUCKET,
  BUCKETS,
};

export { BUCKETS, DEFAULT_BUCKET };
