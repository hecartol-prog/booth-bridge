import { useSyncExternalStore } from "react";
import { getDebugState, subscribeDebugStore } from "@/debug/debugStore";

export function useDebugStore() {
  return useSyncExternalStore(subscribeDebugStore, getDebugState, getDebugState);
}
