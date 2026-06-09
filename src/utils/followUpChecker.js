/**
 * followUpChecker — post-show engagement follow-up intelligence.
 *
 * Evaluates interaction timestamps against saved booths and returns
 * time-sensitive action items for the buyer dashboard queue.
 */

const MS_3_DAYS  = 3  * 24 * 60 * 60 * 1000;
const MS_14_DAYS = 14 * 24 * 60 * 60 * 1000;

/**
 * Given a list of saved booths, returns an array of action item objects.
 *
 * @param {Array} savedBooths - SavedBooth entity records
 * @returns {Array<{ id, type, boothId, company, message, cta, priority }>}
 */
export function computeFollowUpActions(savedBooths = []) {
  const now = Date.now();
  const actions = [];

  for (const booth of savedBooths) {
    const scanTime = booth.created_date ? new Date(booth.created_date).getTime() : null;
    if (!scanTime) continue;

    const age = now - scanTime;
    const status = booth.visit_status || "";
    const followedUp = ["follow_up", "request_quotation", "sample_requested", "supplier_approved"].includes(status);

    if (age >= MS_14_DAYS && !followedUp) {
      actions.push({
        id: `followup-14d-${booth.id}`,
        type: "schedule_meeting",
        priority: "high",
        boothId: booth.id,
        exhibitorUserId: booth.exhibitor_user_id,
        company: booth.exhibitor_company || "This supplier",
        message: `Would you like to schedule a follow-up meeting with ${booth.exhibitor_company || "this supplier"}?`,
        cta: "Schedule Meeting",
      });
    } else if (age >= MS_3_DAYS && !followedUp) {
      actions.push({
        id: `followup-3d-${booth.id}`,
        type: "check_response",
        priority: "medium",
        boothId: booth.id,
        exhibitorUserId: booth.exhibitor_user_id,
        company: booth.exhibitor_company || "This supplier",
        message: `Did ${booth.exhibitor_company || "this supplier"} respond to your catalog request yet?`,
        cta: "Mark as Responded",
      });
    }
  }

  return actions;
}

/**
 * Returns pending RFIs older than 48 hours that have no reply.
 */
export function computeStaleRFIs(rfis = []) {
  const MS_48H = 48 * 60 * 60 * 1000;
  const now = Date.now();
  return rfis.filter(rfi => {
    if (rfi.status === "replied") return false;
    const age = now - new Date(rfi.created_date || 0).getTime();
    return age >= MS_48H;
  });
}