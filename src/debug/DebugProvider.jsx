/**
 * RC10.5 — Debug provider: installs interceptors and pipeline listeners.
 */

import { useEffect } from "react";
import { setPipelineLogListener } from "@/pipeline/pipelineLogger";
import { forwardPipelineLog, incrementRenderCount, addDebugLog, recordAiRequest } from "@/debug/debugStore";
import { onDebugEvent } from "@/debug/debugBridge";
import { installDebugInterceptors } from "@/debug/debugInterceptors";
import { installPlaywrightHooks } from "@/debug/playwrightHooks";
import { AuthTracker } from "@/debug/sections";

export function DebugProvider({ children }) {
  useEffect(() => {
    installDebugInterceptors();
    installPlaywrightHooks();
    setPipelineLogListener(forwardPipelineLog);
    const offAi = onDebugEvent("ai", (payload) => recordAiRequest(/** @type {Record<string, unknown>} */ (payload)));
    addDebugLog("DEBUG", "info", "Debug console initialized");

    return () => {
      setPipelineLogListener(null);
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
