/**
 * dbClient — centralized data access layer.
 *
 * Supabase-native entity access wrapper.
 *
 * Usage:
 *   import { db } from "@/utils/dbClient";
 *   const conn = await db.Connection.create({ ... });
 *   const leads = await db.Connection.filter({ exhibitor_user_id: user.id });
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import { makeSupabaseEntity } from "@/utils/supabaseEntity";
import {
  assertNoError,
  generateUUID as createUUID,
  parseSort as parseSortQuery,
} from "@/utils/supabaseQuery";

// ── UUID helper ────────────────────────────────────────────────────────────
export function generateUUID() {
  return createUUID();
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

// ── Sort parser ("-field" / "+field" → Supabase order) ─────────────────────
export function parseSort(sort = "-created_date") {
  return parseSortQuery(sort);
}

// ── Entity registry (all 39 entities) ───────────────────────────────────────
/** PascalCase entity name → Postgres table name (snake_case). */
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

const ENTITY_OPTIONS = {
  // Notification rows are recipient-readable only under RLS, so inserts must not
  // require the sender to read the new row back immediately.
  Notification: { selectAfterInsert: false },
};

function makeEntity(entityName) {
  const tableName = ENTITY_TABLE_MAP[entityName];
  return makeSupabaseEntity(entityName, tableName, ENTITY_OPTIONS[entityName]);
}

// ── Named entity clients (39 entities) ─────────────────────────────────────
export const db = Object.fromEntries(
  ALL_ENTITY_NAMES.map((name) => [name, makeEntity(name)])
);

/**
 * Cross-user notifications must use the SECURITY DEFINER RPC because RLS only
 * allows authenticated inserts where user_id = auth.uid().
 * Self-notifications still use the direct table insert path.
 */
const notificationEntityCreate = db.Notification.create.bind(db.Notification);
db.Notification.create = async (payload) => {
  const record = { ...payload };
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  assertNoError(authError, "create Notification (auth)");

  if (record.user_id && user?.id && record.user_id !== user.id) {
    const { data: notificationId, error } = await supabase.rpc(
      "create_notification_for_user",
      {
        p_user_id: record.user_id,
        p_type: record.type ?? null,
        p_title: record.title ?? null,
        p_message: record.message ?? null,
        p_from_user_name: record.from_user_name ?? null,
        p_related_id: record.related_id ?? null,
      },
    );
    assertNoError(error, "create Notification (rpc)");
    return { ...record, id: notificationId ?? record.id };
  }

  return notificationEntityCreate(record);
};

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
