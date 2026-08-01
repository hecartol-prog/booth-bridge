import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/authClient";
import { isOnboardingComplete } from "@/api/appUserModel";
import { captureRuntimeError } from "@/monitoring/sentryErrors";

function OnboardingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

/**
 * Blocks app routes until onboarding is complete.
 * Verifies against public.user when AuthContext may hold stale JWT-derived state.
 */
export default function OnboardedGuard({ children }) {
  const { user, checkUserAuth } = useAuth();
  const [gateState, setGateState] = useState("checking");

  const isAdmin = (user?.app_metadata?.role || user?.role || "").toLowerCase() === "admin";
  // Impersonation flag is client-writable — only honor it for verified platform admins.
  const isImpersonating =
    localStorage.getItem("bb_impersonate_as_user") === "true" &&
    (user?.app_metadata?.role || "").toLowerCase() === "admin";

  useEffect(() => {
    if (!user) {
      setGateState("allow");
      return;
    }

    if (isAdmin || isImpersonating) {
      setGateState("allow");
      return;
    }

    if (isOnboardingComplete(user)) {
      setGateState("allow");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const row = await auth.getAppUserOnboardingState(user.id);
        if (cancelled) return;

        if (isOnboardingComplete(row)) {
          await checkUserAuth({ silent: true });
          setGateState("allow");
          return;
        }

        setGateState("redirect");
      } catch (error) {
        captureRuntimeError(error, {
          subsystem: "PROFILE",
          category: "onboarding_state_check_failure",
          component: "OnboardedGuard",
        });
        if (!cancelled) setGateState("allow");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, isImpersonating, checkUserAuth]);

  if (!user || isAdmin || isImpersonating) {
    return children;
  }

  if (gateState === "checking") {
    return <OnboardingSpinner />;
  }

  if (gateState === "redirect") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
