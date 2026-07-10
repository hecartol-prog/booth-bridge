/**
 * RC10.6 — Sentry breadcrumb helpers.
 */

import * as Sentry from "@sentry/react";
import { isSentryEnabled } from "@/monitoring/sentryConfig";
import { scrubMetadata } from "@/monitoring/sentryScrub";

/**
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 * @param {"info"|"warning"|"error"} [level]
 */
export function addAppBreadcrumb(message, data = {}, level = "info") {
  if (!isSentryEnabled()) return;
  Sentry.addBreadcrumb({
    category: "app",
    message,
    level,
    data: scrubMetadata(data),
  });
}

export const sentryBreadcrumbs = {
  login: (userId) => addAppBreadcrumb("auth.login", { userId }),
  logout: () => addAppBreadcrumb("auth.logout"),
  register: (email) => addAppBreadcrumb("auth.register", { email }),
  businessCardUpload: (meta = {}) => addAppBreadcrumb("upload.business_card", meta),
  ocrStarted: (meta = {}) => addAppBreadcrumb("ocr.started", meta),
  ocrFinished: (meta = {}) => addAppBreadcrumb("ocr.finished", meta),
  ocrFailed: (meta = {}) => addAppBreadcrumb("ocr.failed", meta, "error"),
  aiRequest: (meta = {}) => addAppBreadcrumb("ai.request", meta),
  aiResponse: (meta = {}) => addAppBreadcrumb("ai.response", meta),
  storageUpload: (meta = {}) => addAppBreadcrumb("storage.upload", meta),
  meetingCreated: (meta = {}) => addAppBreadcrumb("meeting.created", meta),
  notification: (meta = {}) => addAppBreadcrumb("notifications.event", meta),
  realtimeConnection: (meta = {}) => addAppBreadcrumb("realtime.connection", meta),
  networkOffline: () => addAppBreadcrumb("network.offline", {}, "warning"),
  networkOnline: () => addAppBreadcrumb("network.online"),
};
