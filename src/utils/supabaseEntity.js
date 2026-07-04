/**
 * Supabase-backed entity factory for dbClient (Phase 7.4A).
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import { generateUUID } from "@/utils/supabaseQuery";
import {
  applyFilters,
  applySortAndLimit,
  assertNoError,
  resolvePagination,
} from "@/utils/supabaseQuery";

/** Active realtime channels keyed by table — one multiplexed channel per table */
const realtimeChannels = new Map();

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
    entry.channel.subscribe();
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
 */
export function makeSupabaseEntity(entityName, tableName) {
  const from = () => getSupabaseClient().from(tableName);

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
      return data ?? [];
    },

    async filter(query, sort = "-created_date", limit = 200, pagination) {
      const { limit: lim, offset } = resolvePagination(limit, pagination);
      let builder = applyFilters(from().select("*"), query);
      builder = applySortAndLimit(builder, sort, lim, offset);
      const { data, error } = await builder;
      assertNoError(error, `filter ${entityName}`);
      return data ?? [];
    },

    async get(id) {
      const { data, error } = await from().select("*").eq("id", id).maybeSingle();
      assertNoError(error, `get ${entityName}`);
      return data ?? null;
    },

    async create(payload) {
      const record = prepareWritePayload(payload);
      const { data, error } = await from().insert(record).select("*").single();
      assertNoError(error, `create ${entityName}`);
      return data;
    },

    async update(id, payload) {
      const { data, error } = await from()
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      assertNoError(error, `update ${entityName}`);
      return data;
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
