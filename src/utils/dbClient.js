/**
 * dbClient — centralized data access layer.
 *
 * TODAY:  All operations route through base44 SDK.
 * FUTURE: Swap the internals of each function to use @supabase/supabase-js.
 *         No component code needs to change — only this file.
 *
 * Usage:
 *   import { db } from "@/utils/dbClient";
 *   const conn = await db.Connection.create({ ... });
 *   const leads = await db.Connection.list({ exhibitor_user_id: user.id });
 */

import { base44 } from "@/api/base44Client";

// ── UUID helper ────────────────────────────────────────────────────────────
// Generates RFC-4122 v4 UUIDs client-side so IDs are portable and collision-
// free when migrating to Postgres / Supabase.
export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Metadata serialiser ────────────────────────────────────────────────────
// Ensures metadata objects are stored as plain JSON strings (JSONB-portable).
export function serializeMetadata(obj) {
  if (!obj) return null;
  return typeof obj === "string" ? obj : JSON.stringify(obj);
}

export function deserializeMetadata(str) {
  if (!str) return {};
  if (typeof str === "object") return str;
  try { return JSON.parse(str); } catch { return {}; }
}

// ── Generic entity proxy factory ───────────────────────────────────────────
// Wraps every base44 entity with list/filter/get/create/update/delete.
// When migrating to Supabase, replace the function bodies here only.
function makeEntity(entityName) {
  const entity = base44.entities[entityName];
  return {
    async list(sort = "-created_date", limit = 200) {
      return entity.list(sort, limit);
    },
    async filter(query, sort = "-created_date", limit = 200) {
      return entity.filter(query, sort, limit);
    },
    async get(id) {
      const rows = await entity.filter({ id });
      return rows[0] || null;
    },
    async create(payload) {
      return entity.create(payload);
    },
    async update(id, payload) {
      return entity.update(id, payload);
    },
    async delete(id) {
      return entity.delete(id);
    },
    subscribe(callback) {
      return entity.subscribe(callback);
    },
  };
}

// ── Named entity clients ───────────────────────────────────────────────────
export const db = {
  Connection:         makeEntity("Connection"),
  ExhibitorProfile:   makeEntity("ExhibitorProfile"),
  BuyerProfile:       makeEntity("BuyerProfile"),
  LeadProfile:        makeEntity("LeadProfile"),
  LeadInteraction:    makeEntity("LeadInteraction"),
  LeadIntelligence:   makeEntity("LeadIntelligence"),
  MeetingRequest:     makeEntity("MeetingRequest"),
  Meeting:            makeEntity("Meeting"),
  RFI:                makeEntity("RFI"),
  Activity:           makeEntity("Activity"),
  Product:            makeEntity("Product"),
  CatalogItem:        makeEntity("CatalogItem"),
  SavedBooth:         makeEntity("SavedBooth"),
  SavedProduct:       makeEntity("SavedProduct"),
  Event:              makeEntity("Event"),
  Booth:              makeEntity("Booth"),
  Notification:       makeEntity("Notification"),
  Media:              makeEntity("Media"),
  Company:            makeEntity("Company"),
  IntegrationConnection: makeEntity("IntegrationConnection"),
  IntegrationSyncLog: makeEntity("IntegrationSyncLog"),
  MatchRecommendation: makeEntity("MatchRecommendation"),
  OpportunityPost:    makeEntity("OpportunityPost"),
};

// ── Typed mutation helpers ─────────────────────────────────────────────────
// These are the canonical write paths for all transactional events.
// Swap internals only when migrating to Supabase.

export const saveConnection = (payload) =>
  db.Connection.create(payload);

export const updateConnectionStatus = (id, status, extra = {}) =>
  db.Connection.update(id, { status, ...extra });

export const saveLeadProfile = (payload) =>
  db.LeadProfile.create(payload);

export const saveActivity = (payload) =>
  db.Activity.create({
    ...payload,
    // Ensure metadata is JSONB-portable
    metadata: serializeMetadata(payload.metadata),
  });

export const saveLeadInteraction = (payload) =>
  db.LeadInteraction.create(payload);

export const createMeetingRequest = (payload) =>
  db.MeetingRequest.create(payload);

export const updateMeetingRequest = (id, payload) =>
  db.MeetingRequest.update(id, payload);

export const createRFI = (payload) =>
  db.RFI.create(payload);

export const sendNotification = (userId, type, title, message, fromName, relatedId) =>
  db.Notification.create({
    user_id: userId,
    type,
    title,
    message,
    from_user_name: fromName,
    ...(relatedId ? { related_id: relatedId } : {}),
  });

export const saveBooth = (payload) =>
  db.SavedBooth.create(payload);

export const saveProduct = (payload) =>
  db.SavedProduct.create(payload);