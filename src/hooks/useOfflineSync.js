/**
 * useOfflineSync — monitors network status and drains the offline scan queue
 * when the connection is restored.
 */
import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getPendingScans, removeSyncedScan } from "@/utils/offlineScanQueue";

export function useOfflineSync({ onSyncComplete, onSyncError } = {}) {
  const syncingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;

    try {
      const pending = await getPendingScans();
      if (pending.length === 0) {
        syncingRef.current = false;
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const scan of pending) {
        try {
          const { targetId, scannedByUserId, scannedByName } = scan;

          // Check if connection already exists
          const existing = await base44.entities.Connection.filter({
            exhibitor_user_id: targetId,
            buyer_user_id: scannedByUserId,
          });

          if (existing.length === 0) {
            const exProfiles = await base44.entities.ExhibitorProfile.filter({ user_id: targetId });
            const exProfile = exProfiles[0];

            await base44.entities.Connection.create({
              exhibitor_user_id: targetId,
              buyer_user_id: scannedByUserId,
              status: "accepted",
              initiated_by: "buyer",
              exhibitor_name: exProfile?.digital_card?.name || exProfile?.company_name || "",
              exhibitor_company: exProfile?.company_name || "",
              booth_number: exProfile?.booth_number || "",
              event_name: exProfile?.event_name || "",
              buyer_name: scannedByName,
            });

            await base44.entities.Notification.create({
              user_id: targetId,
              type: "connection_accepted",
              title: "Booth Visit (Synced)",
              message: `${scannedByName} visited your digital booth (synced from offline).`,
              from_user_name: scannedByName,
            });
          }

          await removeSyncedScan(scan.id);
          synced++;
        } catch (_) {
          failed++;
        }
      }

      if (synced > 0 && onSyncComplete) {
        onSyncComplete(synced);
      }
      if (failed > 0 && onSyncError) {
        onSyncError(failed);
      }
    } finally {
      syncingRef.current = false;
    }
  }, [onSyncComplete, onSyncError]);

  useEffect(() => {
    // Try to sync immediately in case we're already online with queued items
    syncQueue();

    const handleOnline = () => syncQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  return { syncQueue };
}