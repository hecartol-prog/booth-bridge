/**
 * Supabase Storage implementation (Phase 7.4C).
 * Internal module — consumed by storageClient.js only.
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import { parseFileRef, toStorageRef } from "@/config/storageBuckets";

function resolveRef(fileRef, options = {}) {
  const parsed = parseFileRef(fileRef, options);
  if (!parsed) throw new Error("[storage] file reference is required");
  if (parsed.kind === "http") {
    throw new Error("[storage] operation not supported for public HTTP URLs");
  }
  if (parsed.kind === "legacy") {
    throw new Error("[storage] legacy file URI cannot be resolved on Supabase backend");
  }
  return parsed;
}

function storageError(error, context) {
  const msg = error?.message || String(error);
  throw new Error(`[storage] ${context}: ${msg}`);
}

/** Ensure the storage client has a JWT before RLS-protected uploads. */
async function ensureStorageSession(supabase) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) return sessionData.session;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error) storageError(error, "session refresh failed");
  if (!refreshed.session?.access_token) {
    storageError(new Error("Not authenticated"), "upload failed");
  }
  return refreshed.session;
}

/**
 * @param {File|Blob} file
 * @param {{ bucket: string, path: string, upsert?: boolean, contentType?: string }} options
 */
export async function supabaseUpload(file, { bucket, path, upsert = true, contentType }) {
  const supabase = getSupabaseClient();
  await ensureStorageSession(supabase);
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert,
    contentType: contentType || file.type || undefined,
  });
  if (error) storageError(error, "upload failed");

  return {
    file_url: toStorageRef(bucket, data.path),
    file_path: data.path,
    bucket,
  };
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string, expiresIn?: number }} options
 */
export async function supabaseGetSignedUrl(fileRef, options = {}) {
  const parsed = parseFileRef(fileRef, options);
  if (!parsed) return null;
  if (parsed.kind === "http") return parsed.url;

  const bucket = parsed.kind === "storage" ? parsed.bucket : options.bucket;
  const path = parsed.kind === "storage" ? parsed.path : fileRef;
  if (!bucket) return null;

  const supabase = getSupabaseClient();
  const expiresIn = options.expiresIn ?? 900;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) storageError(error, "createSignedUrl failed");
  return data?.signedUrl || null;
}

/**
 * @param {string} filePath
 * @param {string} bucket
 */
export function supabaseGetPublicUrl(filePath, bucket) {
  const parsed = parseFileRef(filePath, { bucket });
  if (!parsed) return null;
  if (parsed.kind === "http") return parsed.url;
  if (parsed.kind !== "storage") return null;

  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(parsed.bucket).getPublicUrl(parsed.path);
  return data?.publicUrl || null;
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} options
 */
export async function supabaseDownload(fileRef, options = {}) {
  const parsed = resolveRef(fileRef, options);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path);
  if (error) storageError(error, "download failed");
  return data;
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} options
 */
export async function supabaseRemove(fileRef, options = {}) {
  const parsed = resolveRef(fileRef, options);
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  if (error) storageError(error, "remove failed");
}

/**
 * @param {{ bucket: string, path?: string, limit?: number, offset?: number }} options
 */
export async function supabaseList({ bucket, path = "", limit = 100, offset = 0 }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit,
    offset,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) storageError(error, "list failed");
  return (data || []).map((item) => ({
    name: item.name,
    path: path ? `${path}/${item.name}` : item.name,
    bucket,
    id: item.id,
    metadata: item.metadata,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
}

/**
 * @param {string} fileRef
 * @param {{ bucket?: string }} options
 */
export async function supabaseExists(fileRef, options = {}) {
  const parsed = parseFileRef(fileRef, options);
  if (!parsed) return false;
  if (parsed.kind === "http") return true;
  if (parsed.kind === "legacy") return false;

  const supabase = getSupabaseClient();
  const folder = parsed.path.includes("/")
    ? parsed.path.slice(0, parsed.path.lastIndexOf("/"))
    : "";
  const name = parsed.path.includes("/")
    ? parsed.path.slice(parsed.path.lastIndexOf("/") + 1)
    : parsed.path;

  const { data, error } = await supabase.storage.from(parsed.bucket).list(folder, {
    search: name,
    limit: 1,
  });
  if (error) return false;
  return (data || []).some((item) => item.name === name);
}

/**
 * Folder markers are path prefixes — create by uploading a .keep placeholder.
 */
export async function supabaseCreateFolder(bucket, folderPath) {
  const normalized = folderPath.replace(/^\/+|\/+$/g, "");
  const keepPath = `${normalized}/.keep`;
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(bucket).upload(keepPath, new Blob([""]), {
    upsert: true,
    contentType: "text/plain",
  });
  if (error) storageError(error, "createFolder failed");
  return keepPath;
}

export async function supabaseDeleteFolder(bucket, folderPath) {
  const normalized = folderPath.replace(/^\/+|\/+$/g, "");
  const items = await supabaseList({ bucket, path: normalized, limit: 1000 });
  if (items.length === 0) return;

  const supabase = getSupabaseClient();
  const paths = items.map((item) => item.path);
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) storageError(error, "deleteFolder failed");
}

export async function supabaseCopy(fileRef, destPath, options = {}) {
  const parsed = resolveRef(fileRef, options);
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(parsed.bucket).copy(parsed.path, destPath);
  if (error) storageError(error, "copy failed");
  return toStorageRef(parsed.bucket, destPath);
}

export async function supabaseMove(fileRef, destPath, options = {}) {
  const newRef = await supabaseCopy(fileRef, destPath, options);
  await supabaseRemove(fileRef, options);
  return newRef;
}
