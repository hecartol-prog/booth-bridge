/**
 * RC10.6 — Keep Sentry user context in sync with Supabase auth.
 */

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { clearSentryUser, syncSentryUser } from "@/monitoring/sentryUser";
import { isSentryEnabled } from "@/monitoring/sentryConfig";
import { captureRuntimeError } from "@/monitoring/sentryErrors";

export function SentryUserBridge() {
  const { user, isAuthenticated, authError } = useAuth();

  useEffect(() => {
    if (!isSentryEnabled()) return;
    if (isAuthenticated && user) {
      syncSentryUser(user);
      return;
    }
    clearSentryUser();
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!isSentryEnabled() || !authError) return;
    if (authError.type === "auth_required") return;
    captureRuntimeError(authError.message || "Auth initialization failed", {
      subsystem: "AUTH",
      category: "auth_failure",
      metadata: { type: authError.type },
    });
  }, [authError]);

  return null;
}
