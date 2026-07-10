/**
 * RC10.6 — Initialize Sentry for React + Vite.
 */

import * as Sentry from "@sentry/react";
import {
  getDeviceContext,
  getSentryEnvironment,
  getSentryRelease,
  isSentryEnabled,
} from "@/monitoring/sentryConfig";
import { scrubSentryEvent } from "@/monitoring/sentryScrub";
import { installMonitoringBridge } from "@/monitoring/monitoringBridge";

let initialized = false;

export function initSentry() {
  if (initialized || !isSentryEnabled()) return false;

  const { browser, os, device } = getDeviceContext();

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.supabase\.co/,
      /^https:\/\/.*\.boothbridge\.app/,
    ],
    beforeSend(event) {
      return /** @type {import("@sentry/react").ErrorEvent} */ (scrubSentryEvent(event));
    },
    initialScope: (scope) => {
      scope.setTag("browser", browser);
      scope.setTag("os", os);
      scope.setTag("device", device);
      return scope;
    },
  });

  installMonitoringBridge();

  if (typeof window !== "undefined") {
    window.addEventListener("offline", () => {
      Sentry.addBreadcrumb({ category: "network", message: "offline", level: "warning" });
    });
    window.addEventListener("online", () => {
      Sentry.addBreadcrumb({ category: "network", message: "online", level: "info" });
    });
  }

  initialized = true;
  return true;
}

export { Sentry };
