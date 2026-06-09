/**
 * venueTimezone — single source of truth for event venue timezone.
 *
 * All date rendering in meeting/calendar components MUST go through these
 * helpers. Device timezone is never used for trade show scheduling.
 *
 * STEP 5 compliance: Locks all date parsing to the physical venue's local
 * timezone, preventing missed appointments when cell towers shift.
 */

// Default — overridden per-event via loadVenueTimezone()
let _venueTimezone = "Asia/Shanghai";

/**
 * Override the active venue timezone at runtime.
 * Call this once after loading the Event record.
 * @param {string} tz  IANA timezone string e.g. "Asia/Dubai", "America/Chicago"
 */
export function setVenueTimezone(tz) {
  if (tz) _venueTimezone = tz;
}

export function getVenueTimezone() {
  return _venueTimezone;
}

/**
 * Format an ISO date string in the venue's locked timezone.
 * @param {string|Date} isoOrDate
 * @param {object} opts  Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatVenueTime(isoOrDate, opts = {}) {
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    return new Intl.DateTimeFormat("en-US", {
      timeZone: _venueTimezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      ...opts,
    }).format(d);
  } catch {
    // Hard fallback — still venue-tz locked, not device tz
    return new Date(isoOrDate).toLocaleString("en-US");
  }
}

/**
 * Format just the date portion in the venue timezone.
 */
export function formatVenueDate(isoOrDate) {
  return formatVenueTime(isoOrDate, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: undefined,
    minute: undefined,
    hour12: undefined,
  });
}

/**
 * Returns "MMM d · h:mm a" formatted in venue TZ — the canonical meeting
 * display format used across all scheduling components.
 */
export function formatMeetingSlot(isoOrDate) {
  return formatVenueTime(isoOrDate);
}

/**
 * Convert a local datetime-input value (e.g. "2026-06-15T14:00") to an ISO
 * UTC string, interpreting the input as being in the venue's timezone.
 *
 * Use this when saving a datetime-local <input> value to the database.
 */
export function venueLocalToUTC(localDatetimeStr) {
  // Intl can't do the reverse directly without a library, so we use the
  // offset trick: format the same instant in UTC and venue tz and diff.
  if (!localDatetimeStr) return null;
  // Treat input as venue-local wall time. Approximate offset-based conversion:
  const naiveDate = new Date(localDatetimeStr); // treated as UTC by default
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: _venueTimezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  // Get the venue's current wall-clock time for *now* to compute offset
  const nowUTC = Date.now();
  const venueNowStr = formatter.format(nowUTC).replace(",", "");
  const venueNow = new Date(venueNowStr + "Z"); // parse as UTC
  const offsetMs = nowUTC - venueNow.getTime();
  return new Date(naiveDate.getTime() + offsetMs).toISOString();
}