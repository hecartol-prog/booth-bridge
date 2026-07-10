/**
 * Supabase-backed entity factory for dbClient (Phase 7.4A).
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import { storage } from "@/api/storageClient";
import { generateUUID } from "@/utils/supabaseQuery";
import { sentryBreadcrumbs } from "@/monitoring/sentryBreadcrumbs";
import {
  applyFilters,
  applySortAndLimit,
  assertNoError,
  resolvePagination,
} from "@/utils/supabaseQuery";

/** Active realtime channels keyed by table — one multiplexed channel per table */
const realtimeChannels = new Map();
const assetUrlCache = new Map();
const ASSET_URL_TTL_MS = 10 * 60 * 1000;
const ASSET_FIELDS = new Set([
  "file_url",
  "logo_url",
  "image_url",
  "thumbnail_url",
  "banner_url",
  "product_image_url",
  "raw_image_url",
]);

async function resolveAssetUrl(fileRef) {
  if (!fileRef || typeof fileRef !== "string") return fileRef;

  const cached = assetUrlCache.get(fileRef);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const signedUrl = await storage.getSignedUrl(fileRef, { expiresIn: 900 });
    const resolved = signedUrl || fileRef;
    assetUrlCache.set(fileRef, {
      url: resolved,
      expiresAt: Date.now() + ASSET_URL_TTL_MS,
    });
    return resolved;
  } catch {
    return fileRef;
  }
}

async function resolveAssetFields(record) {
  if (!record || typeof record !== "object") return record;

  const entries = await Promise.all(
    Object.entries(record).map(async ([key, value]) => {
      if (!ASSET_FIELDS.has(key) || typeof value !== "string") {
        return [key, value];
      }
      return [key, await resolveAssetUrl(value)];
    }),
  );

  return Object.fromEntries(entries);
}

async function resolveAssetPayload(payload) {
  if (Array.isArray(payload)) {
    return Promise.all(payload.map(resolveAssetFields));
  }
  return resolveAssetFields(payload);
}

function getTableChannel(tableName) {
  const supabase = getSupabaseClient();
  if (!realtimeChannels.has(tableName)) {
    const channel = supabase.channel(`db-realtime:${tableName}`);
    realtimeChannels.set(tableName, { channel, refCount: 0, callbacks: new Set() });
  }
  return realtimeChannels.get(tableName);
}

function ensureChannelSubscribed(tableName) {
  const entry = getTableChannel(tableName);
  if (entry.refCount === 0) {
    entry.channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: tableName },
      (payload) => {
        entry.callbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch {
            /* subscriber error — isolate */
          }
        });
      }
    );
    entry.channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        sentryBreadcrumbs.realtimeConnection({ table: tableName, status });
      }
    });
  }
  entry.refCount += 1;
  return entry;
}

function releaseChannel(tableName) {
  const entry = realtimeChannels.get(tableName);
  if (!entry) return;
  entry.refCount = Math.max(0, entry.refCount - 1);
  if (entry.refCount === 0) {
    getSupabaseClient().removeChannel(entry.channel);
    realtimeChannels.delete(tableName);
  }
}

function prepareWritePayload(payload) {
  const record = { ...payload };
  if (!record.id) {
    record.id = generateUUID();
  }
  return record;
}

/**
 * @param {string} entityName PascalCase entity name
 * @param {string} tableName Postgres table name
 * @param {{ selectAfterInsert?: boolean }} [options]
 */
export function makeSupabaseEntity(entityName, tableName, options = {}) {
  const from = () => getSupabaseClient().from(tableName);
  const selectAfterInsert = options.selectAfterInsert !== false;

  return {
    async list(sort = "-created_date", limit = 200, pagination) {
      const { limit: lim, offset } = resolvePagination(limit, pagination);
      const { data, error } = await applySortAndLimit(
        from().select("*"),
        sort,
        lim,
        offset
      );
      assertNoError(error, `list ${entityName}`);
      return resolveAssetPayload(data ?? []);
    },

    async filter(query, sort = "-created_date", limit = 200, pagination) {
      const { limit: lim, offset } = resolvePagination(limit, pagination);
      let builder = applyFilters(from().select("*"), query);
      builder = applySortAndLimit(builder, sort, lim, offset);
      const { data, error } = await builder;
      assertNoError(error, `filter ${entityName}`);
      return resolveAssetPayload(data ?? []);
    },

    async get(id) {
      const { data, error } = await from().select("*").eq("id", id).maybeSingle();
      assertNoError(error, `get ${entityName}`);
      return resolveAssetPayload(data ?? null);
    },

    async create(payload) {
      const record = prepareWritePayload(payload);
      if (!selectAfterInsert) {
        const { error } = await from().insert(record);
        assertNoError(error, `create ${entityName}`);
        return record;
      }

      const { data, error } = await from().insert(record).select("*").single();
      assertNoError(error, `create ${entityName}`);
      return resolveAssetPayload(data);
    },

    async update(id, payload) {
      const { data, error } = await from()
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      assertNoError(error, `update ${entityName}`);
      return resolveAssetPayload(data);
    },

    async delete(id) {
      const { error } = await from().delete().eq("id", id);
      assertNoError(error, `delete ${entityName}`);
    },

    async count(query) {
      let builder = from().select("*", { count: "exact", head: true });
      builder = applyFilters(builder, query);
      const { count, error } = await builder;
      assertNoError(error, `count ${entityName}`);
      return count ?? 0;
    },

    subscribe(callback) {
      if (typeof callback !== "function") {
        return () => {};
      }
      const entry = ensureChannelSubscribed(tableName);
      entry.callbacks.add(callback);
      return () => {
        entry.callbacks.delete(callback);
        releaseChannel(tableName);
      };
    },
  };
}
