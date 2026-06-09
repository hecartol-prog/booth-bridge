/**
 * leadScoring — canonical scoring engine for Booth Bridge.
 * Used by both the exhibitor dashboard and the Lead Intelligence page.
 */

export const SCORE_WEIGHTS = {
  // QR / existing
  viewed_booth:       10,
  viewed_product:      5,
  opened_profile:      5,
  saved_supplier:     20,
  saved_product:      15,
  scanned_qr:         10,
  downloaded_catalog: 25,
  submitted_rfi:      35,
  requested_meeting:  50,
  accepted_meeting:   50,
  completed_meeting:  75,
  sent_message:        5,
  scan_qr:            10,
  view_booth:         10,
  view_product:        5,
  download_catalog:   25,
  send_rfi:           35,
  schedule_meeting:   50,
  attend_meeting:     75,
  // NFC
  nfc_badge_tap:      10,
  nfc_product_tap:    15,
  nfc_booth_tap:      10,
  // OCR
  business_card_scan: 20,
  badge_scan:         15,
};

export const TEMPERATURE_BANDS = [
  { min: 300, label: "Ready to Buy", emoji: "🔥", color: "text-red-700",    bg: "bg-red-100",    border: "border-red-300"    },
  { min: 150, label: "Hot",          emoji: "♨️", color: "text-orange-700", bg: "bg-orange-100", border: "border-orange-300" },
  { min:  50, label: "Warm",         emoji: "🌡️", color: "text-amber-700",  bg: "bg-amber-100",  border: "border-amber-300"  },
  { min:   0, label: "Cold",         emoji: "❄️", color: "text-blue-700",   bg: "bg-blue-100",   border: "border-blue-300"   },
];

export function calculateLeadScore(interactions = []) {
  return interactions.reduce((total, i) => {
    const type = i.interaction_type || i.activity_type || "";
    return total + (SCORE_WEIGHTS[type] || 0) + (i.points || 0);
  }, 0);
}

export function getLeadTemperature(score) {
  return TEMPERATURE_BANDS.find(b => score >= b.min) || TEMPERATURE_BANDS[3];
}

export function categorizeLeads(leadMap) {
  // leadMap: { buyerId: { name, company, country, interactions[] } }
  return Object.entries(leadMap)
    .map(([buyerId, data]) => {
      const score = calculateLeadScore(data.interactions || []);
      const temp = getLeadTemperature(score);
      return { buyerId, score, temp, ...data };
    })
    .sort((a, b) => b.score - a.score);
}