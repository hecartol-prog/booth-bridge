/**
 * dbClient — centralized data access layer.
 *
 * TODAY:  All operations route through base44 SDK when VITE_DATA_BACKEND=base44 (default).
 * FUTURE: Swap internals to Supabase when VITE_DATA_BACKEND=supabase (Phase 4+).
 *
 * Usage:
 *   import { db } from "@/utils/dbClient";
 *   const conn = await db.Connection.create({ ... });
 *   const leads = await db.Connection.filter({ exhibitor_user_id: user.id });
 */

import { base44 } from "@/api/base44Client";
import { isBase44 } from "@/config/backend";

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

// ── Sort parser (Base44 "-field" convention → Supabase order in Phase 4) ───
export function parseSort(sort = "-created_date") {
  if (!sort || typeof sort !== "string") {
    return { column: "created_date", ascending: false };
  }
  const ascending = !sort.startsWith("-");
  const column = ascending ? sort : sort.slice(1);
  return { column, ascending };
}

// ── Entity registry (all 39 Base44 entities) ───────────────────────────────
/** PascalCase entity name → Postgres table name (snake_case) for Supabase phase */
export const ENTITY_TABLE_MAP = {
  Activity: "activity",
  AdminAccessLog: "admin_access_log",
  BillingSubscription: "billing_subscription",
  BillingTransaction: "billing_transaction",
  Booth: "booth",
  BuyerProfile: "buyer_profile",
  CatalogItem: "catalog_item",
  Company: "company",
  Connection: "connection",
  Event: "event",
  ExhibitorProfile: "exhibitor_profile",
  IntegrationConnection: "integration_connection",
  IntegrationSyncLog: "integration_sync_log",
  LeadIntelligence: "lead_intelligence",
  LeadInteraction: "lead_interaction",
  LeadProfile: "lead_profile",
  MatchRecommendation: "match_recommendation",
  Media: "media",
  Meeting: "meeting",
  MeetingRequest: "meeting_request",
  NFCInteraction: "nfc_interaction",
  NFCProductTag: "nfc_product_tag",
  NFCProfile: "nfc_profile",
  Notification: "notification",
  OpportunityPost: "opportunity_post",
  PremiumBoothSubscription: "premium_booth_subscription",
  Product: "product",
  ProjectSupplierMapping: "project_supplier_mapping",
  RFI: "rfi",
  SavedBooth: "saved_booth",
  SavedProduct: "saved_product",
  ScannedContact: "scanned_contact",
  SourcingProject: "sourcing_project",
  SponsoredListing: "sponsored_listing",
  StressTestResult: "stress_test_result",
  SupportTicket: "support_ticket",
  SystemAlert: "system_alert",
  User: "user",
  VerificationProfile: "verification_profile",
};

export const ALL_ENTITY_NAMES = Object.keys(ENTITY_TABLE_MAP);

// ── Base44 entity proxy ────────────────────────────────────────────────────
function makeBase44Entity(entityName) {
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
      if (typeof entity.subscribe === "function") {
        return entity.subscribe(callback);
      }
      return () => {};
    },
  };
}

// ── Supabase entity stub (Phase 4 implementation) ──────────────────────────
function makeSupabaseEntityStub(entityName) {
  const tableName = ENTITY_TABLE_MAP[entityName];
  const notReady = () => {
    throw new Error(
      `[dbClient] Supabase queries for "${entityName}" (${tableName}) activate in Phase 4. Set VITE_DATA_BACKEND=base44.`
    );
  };
  return {
    list: notReady,
    filter: notReady,
    get: notReady,
    create: notReady,
    update: notReady,
    delete: notReady,
    subscribe: () => () => {},
  };
}

function makeEntity(entityName) {
  if (isBase44()) return makeBase44Entity(entityName);
  return makeSupabaseEntityStub(entityName);
}

// ── Named entity clients (39 entities) ─────────────────────────────────────
export const db = Object.fromEntries(
  ALL_ENTITY_NAMES.map((name) => [name, makeEntity(name)])
);

// ── Sourcing project helpers ───────────────────────────────────────────────
export const createSourcingProject = (payload) =>
  db.SourcingProject.create(payload);

export const addSupplierToProject = (payload) =>
  db.ProjectSupplierMapping.create(payload);

export const saveEvaluation = (mappingId, fields) =>
  db.ProjectSupplierMapping.update(mappingId, fields);

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
