import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/authClient";
import { isOnboardingComplete } from "@/api/appUserModel";
import { isAdminRole } from "@/api/supabaseAuth";
import { captureRuntimeError } from "@/monitoring/sentryErrors";
import { Button } from "@/components/ui/button";

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
  const [retryToken, setRetryToken] = useState(0);

  const isAdmin = isAdminRole(user);
  // Impersonation flag is client-writable — only honor it for verified platform admins.
  const isImpersonating =
    localStorage.getItem("bb_impersonate_as_user") === "true" && isAdmin;

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
    setGateState("checking");

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
        console.error("Onboarding state check failed:", error);
        captureRuntimeError(error, {
          subsystem: "PROFILE",
          category: "onboarding_state_check_failure",
          component: "OnboardedGuard",
        });
        // Fail closed — do not allow into the app without a successful check
        if (!cancelled) setGateState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, isImpersonating, checkUserAuth, retryToken]);

  if (!user || isAdmin || isImpersonating) {
    return children;
  }

  if (gateState === "checking") {
    return <OnboardingSpinner />;
  }

  if (gateState === "error") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Could not verify onboarding status. Check your connection and try again.
        </p>
        <Button type="button" onClick={() => setRetryToken((n) => n + 1)}>
          Retry
        </Button>
      </div>
    );
  }

  if (gateState === "redirect") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
