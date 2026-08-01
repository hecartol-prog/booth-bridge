/**
 * storageClient — file storage abstraction (Phase 7.4C).
 *
 * Supabase Storage wrapper used by pages and assetPipeline.
 */

import {
  BUCKETS,
  resolveUploadDestination,
  parseFileRef,
} from "@/config/storageBuckets";
import * as supabaseStorage from "@/api/supabaseStorage";

const DEFAULT_BUCKET = BUCKETS.ASSETS;

/** Client-side signed URL LRU cache (TTL under typical 15-min expiry). */
const urlCache = new Map();
const MAX_CACHE = 50;
const CACHE_TTL = 14 * 60 * 1000; // 14 min (signed URL lifetime)

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

  const cacheKey = `${options.bucket || ""}:${options.expiresIn || ""}:${fileRef}`;
  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;

  const url = await supabaseStorage.supabaseGetSignedUrl(fileRef, options);
  if (url) {
    urlCache.set(cacheKey, { url, ts: Date.now() });
    if (urlCache.size > MAX_CACHE) {
      const oldest = urlCache.keys().next().value;
      urlCache.delete(oldest);
    }
  }
  return url;
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
  return supabaseStorage.supabaseGetPublicUrl(filePath, bucket);
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} [options]
 * @returns {Promise<Blob>}
 */
export async function download(fileRef, options = {}) {
  return supabaseStorage.supabaseDownload(fileRef, options);
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} [options]
 */
export async function remove(fileRef, options = {}) {
  return supabaseStorage.supabaseRemove(fileRef, options);
}

/**
 * @param {{ bucket: string, path?: string, limit?: number, offset?: number }} options
 */
export async function list(options) {
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

  return supabaseStorage.supabaseExists(fileRef, options);
}

/**
 * @param {string} bucket
 * @param {string} folderPath
 */
export async function createFolder(bucket, folderPath) {
  return supabaseStorage.supabaseCreateFolder(bucket, folderPath);
}

/**
 * @param {string} bucket
 * @param {string} folderPath
 */
export async function deleteFolder(bucket, folderPath) {
  return supabaseStorage.supabaseDeleteFolder(bucket, folderPath);
}

/**
 * @param {string} fileRef
 * @param {string} destPath
 * @param {{ bucket?: string }} [options]
 */
export async function copy(fileRef, destPath, options = {}) {
  return supabaseStorage.supabaseCopy(fileRef, destPath, options);
}

/**
 * @param {string} fileRef
 * @param {string} destPath
 * @param {{ bucket?: string }} [options]
 */
export async function move(fileRef, destPath, options = {}) {
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
