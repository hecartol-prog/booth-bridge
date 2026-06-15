/**
 * useOfflineSync — unified background sync hook.
 * Processes both exhibitor QR scan queue and visitor interaction queue
 * when network is restored.
 */
import { useEffect, useRef, useCallback } from "react";
import { db } from "@/utils/dbClient";
import { getPendingScans, removeSyncedScan } from "@/utils/offlineScanQueue";
import {
  getPendingVisitorActions,
  removeSyncedVisitorAction,
  VISITOR_ACTIONS,
} from "@/utils/visitorInteractionQueue";

// ── Scan sync ──────────────────────────────────────────────────────────────

async function syncScans() {
  const pending = await getPendingScans();
  let synced = 0;
  let failed = 0;

  for (const scan of pending) {
    try {
      const { targetId, scannedByUserId, scannedByName } = scan;
      const existing = await db.Connection.filter({
        exhibitor_user_id: targetId,
        buyer_user_id: scannedByUserId,
      });

      if (existing.length === 0) {
        const exProfiles = await db.ExhibitorProfile.filter({ user_id: targetId });
        const exProfile = exProfiles[0];

        await db.Connection.create({
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

        await db.Notification.create({
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

  return { synced, failed };
}

// ── Visitor interaction sync ───────────────────────────────────────────────

async function syncVisitorActions() {
  const pending = await getPendingVisitorActions();
  let synced = 0;
  let failed = 0;

  for (const action of pending) {
    try {
      switch (action.actionType) {

        case VISITOR_ACTIONS.SAVE_BOOTH: {
          const existing = await db.SavedBooth.filter({
            buyer_id: action.userId,
            exhibitor_user_id: action.exhibitorUserId,
          });
          if (existing.length === 0) {
            await db.SavedBooth.create({
              buyer_id: action.userId,
              exhibitor_user_id: action.exhibitorUserId,
              exhibitor_profile_id: action.exhibitorProfileId,
              exhibitor_company: action.exhibitorCompany,
              booth_number: action.boothNumber,
              event_name: action.eventName,
              notes: action.notes || "",
              visit_status: action.visitStatus || "interested",
            });
          }
          break;
        }

        case VISITOR_ACTIONS.SAVE_PRODUCT: {
          const existing = await db.SavedProduct.filter({
            buyer_id: action.userId,
            product_id: action.productId,
          });
          if (existing.length === 0) {
            await db.SavedProduct.create({
              buyer_id: action.userId,
              product_id: action.productId,
              exhibitor_user_id: action.exhibitorUserId,
              exhibitor_company: action.exhibitorCompany,
              event_name: action.eventName,
              product_title: action.productTitle,
              product_image_url: action.productImageUrl,
              interest_level: "medium",
            });
          }
          break;
        }

        case VISITOR_ACTIONS.DOWNLOAD_CATALOG: {
          // Just increment download count — fire-and-forget if already done is OK
          await db.CatalogItem.update(action.catalogId, {
            download_count: action.currentCount + 1,
          });
          break;
        }

        case VISITOR_ACTIONS.SUBMIT_RFI: {
          await db.RFI.create({
            connection_id: action.connectionId || "",
            buyer_user_id: action.userId,
            exhibitor_user_id: action.exhibitorUserId,
            request_type: action.rfiType,
            message: action.message,
            status: "pending",
            buyer_name: action.buyerName,
            exhibitor_company: action.exhibitorCompany,
          });
          await db.Notification.create({
            user_id: action.exhibitorUserId,
            type: "rfi_received",
            title: "New Request Received (Synced)",
            message: `${action.buyerName} sent a ${action.rfiType.replace(/_/g, " ")} request (synced from offline).`,
            from_user_name: action.buyerName,
          });
          break;
        }

        default:
          break;
      }

      await removeSyncedVisitorAction(action.id);
      synced++;
    } catch (_) {
      failed++;
    }
  }

  return { synced, failed };
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineSync({ onSyncComplete, onSyncError } = {}) {
  const syncingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;

    try {
      const [scanResult, visitorResult] = await Promise.all([
        syncScans(),
        syncVisitorActions(),
      ]);

      const totalSynced = scanResult.synced + visitorResult.synced;
      const totalFailed = scanResult.failed + visitorResult.failed;

      if (totalSynced > 0 && onSyncComplete) onSyncComplete(totalSynced);
      if (totalFailed > 0 && onSyncError) onSyncError(totalFailed);
    } finally {
      syncingRef.current = false;
    }
  }, [onSyncComplete, onSyncError]);

  useEffect(() => {
    syncQueue();
    const handleOnline = () => syncQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  return { syncQueue };
}