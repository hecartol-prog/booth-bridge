/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01). Do not execute.
 * Canonical entity list for Phase 6 export (historical).
 * Mirrors ENTITY_TABLE_MAP in src/utils/dbClient.js — kept standalone so Node
 * scripts do not depend on Vite path aliases or React modules.
 */
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

export const ALL_ENTITY_NAMES = Object.freeze(Object.keys(ENTITY_TABLE_MAP));

export const PAGE_SIZE = 5000;
export const DEFAULT_SORT = "-created_date";

/** UUID verification sampling (Phase 6C.3B spec). */
export const UUID_SAMPLE_FIRST = 5;
export const UUID_SAMPLE_LAST = 5;
export const UUID_SAMPLE_RANDOM = 10;
export const UUID_SAMPLE_MAX = 20;
export const UUID_SAMPLE_SORT_ASC = "+created_date";
export const UUID_SAMPLE_SORT_DESC = "-created_date";
