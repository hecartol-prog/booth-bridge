export const INTERACTION_POINTS = {
  scan_qr: 10,
  view_booth: 10,
  view_product: 15,
  download_catalog: 25,
  send_rfi: 50,
  schedule_meeting: 75,
  attend_meeting: 100,
};

export function calculateLeadScore(interactions = []) {
  return interactions.reduce((sum, i) => sum + (i.points || INTERACTION_POINTS[i.interaction_type] || 0), 0);
}

export function getLeadTemperature(score) {
  if (score >= 151) return { label: "Hot", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", emoji: "🔥" };
  if (score >= 51) return { label: "Warm", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", emoji: "🌡️" };
  return { label: "Cold", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", emoji: "❄️" };
}

export async function trackInteraction(base44, { buyer_user_id, exhibitor_user_id, interaction_type, event_name, metadata }) {
  const points = INTERACTION_POINTS[interaction_type] || 0;
  await base44.entities.LeadInteraction.create({
    buyer_user_id,
    exhibitor_user_id,
    interaction_type,
    points,
    event_name: event_name || "",
    metadata: metadata || {},
  });
}