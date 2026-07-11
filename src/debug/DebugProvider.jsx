/**
 * RC10.5 — Debug provider: installs interceptors and pipeline listeners.
 */

import { useEffect } from "react";
import { incrementRenderCount, addDebugLog, recordAiRequest } from "@/debug/debugStore";
import { onDebugEvent } from "@/debug/debugBridge";
import { installPlaywrightHooks } from "@/debug/playwrightHooks";
import { AuthTracker } from "@/debug/sections";

export function DebugProvider({ children }) {
  useEffect(() => {
    installPlaywrightHooks();
    const offAi = onDebugEvent("ai", (payload) => recordAiRequest(/** @type {Record<string, unknown>} */ (payload)));
    addDebugLog("DEBUG", "info", "Debug console initialized");

    return () => {
      offAi();
    };
  }, []);

  useEffect(() => {
    incrementRenderCount();
  });

  return (
    <>
      <AuthTracker />
      {children}
    </>
  );
}
