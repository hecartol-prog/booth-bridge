import { WifiOff, CloudUpload } from "lucide-react";

export default function OfflineBanner({ isOnline, pendingCount = 0 }) {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
        <WifiOff className="w-4 h-4 shrink-0" />
        Working Offline — actions are saved locally and will sync when reconnected.
      </div>
    );
  }
  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium">
        <CloudUpload className="w-4 h-4 shrink-0 animate-pulse" />
        Syncing {pendingCount} offline action{pendingCount > 1 ? "s" : ""}…
      </div>
    );
  }
  return null;
}