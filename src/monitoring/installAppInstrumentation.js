/**
 * RC10.6 — Always-on instrumentation for Sentry monitoring bridge.
 * Installed at app bootstrap (not gated behind the debug console).
 */

import { setPipelineLogListener } from "@/pipeline/pipelineLogger";
import { forwardPipelineLog } from "@/debug/debugStore";
import { installDebugInterceptors } from "@/debug/debugInterceptors";

let installed = false;

export function installAppInstrumentation() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  installDebugInterceptors();
  setPipelineLogListener(forwardPipelineLog);
}
