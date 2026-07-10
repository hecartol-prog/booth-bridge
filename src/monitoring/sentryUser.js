/**
 * RC10.6 — Attach Supabase user context to Sentry (never secrets).
 */

import * as Sentry from "@sentry/react";
import { isSentryEnabled } from "@/monitoring/sentryConfig";

/**
 * @param {{ id?: string, email?: string, role?: string, user_role?: string, profile_id?: string, company_id?: string, event_id?: string, user_metadata?: Record<string, unknown> } | null | undefined} user
 */
export function syncSentryUser(user) {
  if (!isSentryEnabled()) return;

  if (!user?.id) {
    Sentry.setUser(null);
    return;
  }

  const meta = user.user_metadata || {};
  const companyId = user.company_id || user.profile_id || meta.company_id || null;
  const eventId = user.event_id || meta.event_id || null;

  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
    username: user.email || undefined,
  });

  Sentry.setContext("boothbridge_user", {
    role: user.role || null,
    user_role: user.user_role || null,
    company_id: companyId,
    event_id: eventId,
  });
}

export function clearSentryUser() {
  if (!isSentryEnabled()) return;
  Sentry.setUser(null);
  Sentry.setContext("boothbridge_user", null);
}
