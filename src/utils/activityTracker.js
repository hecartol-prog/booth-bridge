import { base44 } from "@/api/base44Client";

const ACTIVITY_POINTS = {
  scanned_qr: 10,
  viewed_booth: 5,
  viewed_product: 3,
  viewed_company: 3,
  opened_profile: 5,
  saved_supplier: 8,
  saved_product: 5,
  downloaded_catalog: 15,
  submitted_rfi: 50,
  requested_meeting: 30,
  accepted_meeting: 20,
  completed_meeting: 40,
  rejected_meeting: 0,
  created_connection: 10,
  clicked_contact: 3,
  clicked_website: 2,
  visited_event: 5,
  connected_supplier: 10,
  connected_buyer: 10,
  created_opportunity: 20,
  converted_lead: 50,
  exported_lead: 5,
  shared_profile: 5,
};

/**
 * Track an activity. Fire-and-forget — never throws.
 * @param {string} activityType - one of the enum values
 * @param {object} context - optional fields: event_id, event_name, booth_id, product_id, etc.
 */
export async function trackActivity(activityType, context = {}) {
  try {
    const points = ACTIVITY_POINTS[activityType] ?? 0;
    await base44.entities.Activity.create({
      activity_type: activityType,
      points,
      source_device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
      status: "recorded",
      ...context,
    });
  } catch {
    // Silently ignore — activity tracking must never break app flow
  }
}

export { ACTIVITY_POINTS };