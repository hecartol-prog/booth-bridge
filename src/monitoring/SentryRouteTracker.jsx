/**
 * RC10.6 — Track current route in Sentry tags and breadcrumbs.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { isSentryEnabled } from "@/monitoring/sentryConfig";

export function SentryRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!isSentryEnabled()) return;
    Sentry.setTag("route", location.pathname);
    Sentry.addBreadcrumb({
      category: "navigation",
      message: location.pathname + location.search,
      level: "info",
    });
  }, [location.pathname, location.search]);

  return null;
}
