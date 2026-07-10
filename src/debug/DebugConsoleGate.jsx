/**
 * RC10.6 — Lazy-loaded debug console gate with Supabase authorization.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/authClient";
import { getDebugAccess, isDebugConsoleEnabled } from "@/debug/debugGate";

const DebugConsole = lazy(() => import("@/debug/DebugConsole"));
const STORAGE_KEY = "bb_debug_console";

function closeDebugConsoleUi() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, expanded: false }));
  } catch {
    /* ignore */
  }
}

export function DebugConsoleGate() {
  const { user, isAuthenticated, authChecked } = useAuth();
  const access = useMemo(
    () => getDebugAccess(user, isAuthenticated),
    [user, isAuthenticated],
  );
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!authChecked) return;
    const allowed = isDebugConsoleEnabled(user, isAuthenticated);
    if (!allowed) {
      closeDebugConsoleUi();
    }
    setEnabled(allowed);
  }, [user, isAuthenticated, authChecked, access.reason]);

  useEffect(() => {
    if (!enabled || !authChecked) return undefined;

    let cancelled = false;
    const verifySession = async () => {
      try {
        const session = await auth.currentSession();
        if (cancelled) return;
        if (!session || !isDebugConsoleEnabled(user, true)) {
          closeDebugConsoleUi();
          setEnabled(false);
        }
      } catch {
        if (!cancelled) {
          closeDebugConsoleUi();
          setEnabled(false);
        }
      }
    };

    const interval = setInterval(verifySession, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, authChecked, user]);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <DebugConsole access={access} />
    </Suspense>
  );
}
