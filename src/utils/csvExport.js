/**
 * csvExport — client-side CSV generation utilities.
 *
 * STEP 6 compliance: All formatting and download triggering is browser-side.
 * No backend call, no server processing — instant download from local state.
 */

import { formatMeetingSlot } from "@/utils/venueTimezone";

// ── Core builder ───────────────────────────────────────────────────────────

function escapeCell(value) {
  const str = value == null ? "" : String(value);
  // Wrap in quotes and escape inner quotes per RFC 4180
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCSV(headers, rows) {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map(row => row.map(escapeCell).join(",")),
  ];
  return lines.join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Domain exporters ───────────────────────────────────────────────────────

/**
 * Export exhibitor leads (accepted connections) to CSV.
 */
export function exportLeadsCSV({ connections = [], rfis = [], meetings = [], filename }) {
  const headers = [
    "Name", "Company", "Email", "Country",
    "Booth", "Event", "Connected At",
    "Status", "RFI Count", "Meeting Count",
    "Follow-up", "Notes",
  ];

  const rows = connections.map(conn => {
    const connRfis = rfis.filter(r =>
      r.connection_id === conn.id ||
      r.buyer_user_id === conn.buyer_user_id
    );
    const connMeetings = meetings.filter(m =>
      m.connection_id === conn.id ||
      m.proposed_to === conn.buyer_user_id ||
      m.proposed_by === conn.buyer_user_id
    );

    return [
      conn.buyer_name || "",
      conn.buyer_company || "",
      conn.buyer_email || "",
      conn.buyer_country || "",
      conn.booth_number || "",
      conn.event_name || "",
      conn.created_date ? formatMeetingSlot(conn.created_date) : "",
      conn.status || "",
      connRfis.length,
      connMeetings.length,
      conn.follow_up_status || "",
      conn.exhibitor_notes || "",
    ];
  });

  const date = new Date().toISOString().split("T")[0];
  downloadCSV(buildCSV(headers, rows), filename || `leads-${date}.csv`);
}

/**
 * Export a generic array of flat objects to CSV.
 * Useful for ad-hoc exports (RFIs, meetings, saved products, etc.)
 */
export function exportGenericCSV(data = [], filename = "export.csv") {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(h => obj[h]));
  downloadCSV(buildCSV(headers, rows), filename);
}

/**
 * Export meeting list to CSV with venue-timezone formatted times.
 */
export function exportMeetingsCSV(meetings = [], currentUserId, filename) {
  const headers = ["Title", "With", "Time (Venue TZ)", "Duration (min)", "Status", "Location"];

  const rows = meetings.map(m => [
    m.title || "Meeting",
    m.proposed_by === currentUserId ? m.recipient_name : m.proposer_name,
    m.proposed_time ? formatMeetingSlot(m.proposed_time) : "",
    m.duration || "",
    m.status || "",
    m.location || "",
  ]);

  const date = new Date().toISOString().split("T")[0];
  downloadCSV(buildCSV(headers, rows), filename || `meetings-${date}.csv`);
}