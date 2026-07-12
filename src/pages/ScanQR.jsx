import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Link2, AlertCircle, Building2, Loader2, WifiOff, CloudUpload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DigitalBooth from "./DigitalBooth";
import { enqueueScan, getPendingCount } from "@/utils/offlineScanQueue";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { captureRuntimeError } from "@/monitoring/sentryErrors";
import { loadJsQR } from "@/utils/loadJsQR";
import { validateQRPayload } from "@/utils/securitySanitizer";

export default function ScanQR() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manualId, setManualId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [boothUserId, setBoothUserId] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animFrameRef = useRef(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back Online", description: "Connection restored. Syncing offline scans..." });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({ title: "Offline Mode Active", description: "Scans will be saved locally and synced when reconnected.", variant: "destructive" });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Refresh pending count on mount and after each scan
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // Background sync — runs when back online
  useOfflineSync({
    onSyncComplete: (count) => {
      toast({ title: `${count} offline scan${count > 1 ? "s" : ""} synced`, description: "All queued booth visits have been uploaded." });
      refreshPendingCount();
    },
    onSyncError: (count) => {
      toast({ title: "Sync partially failed", description: `${count} scan(s) could not be synced. Will retry.`, variant: "destructive" });
    },
  });

  // ── Camera ─────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCameraError("");
    setScanning(true);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError("Camera not available. Your browser or connection may not support camera access. Use the code entry below.");
      setScanning(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "");
        video.muted = true;
        await video.play();
      }
      setCameraActive(true);

      if ("BarcodeDetector" in window) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        const detect = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }
          const barcodes = await detectorRef.current.detect(videoRef.current).catch(() => []);
          if (barcodes.length > 0) {
            stopCamera();
            handleScan(barcodes[0].rawValue);
            return;
          }
          animFrameRef.current = requestAnimationFrame(detect);
        };
        animFrameRef.current = requestAnimationFrame(detect);
      } else {
        const qr = await loadJsQR();
        if (!qr) {
          setCameraError("Live QR detection not supported on this browser. Use code entry below.");
          setScanning(false);
          stopCamera();
          return;
        }
        const scanWithJsQR = async () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(scanWithJsQR);
            return;
          }
          const ctx = canvas.getContext("2d");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = qr(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code?.data) {
            stopCamera();
            handleScan(code.data);
            return;
          }
          animFrameRef.current = requestAnimationFrame(scanWithJsQR);
        };
        animFrameRef.current = requestAnimationFrame(scanWithJsQR);
      }
    } catch (err) {
      let message = "Camera access denied. Please allow camera permissions and try again.";
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        message = "No camera found on this device. Use the code entry below.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        message = "Camera is in use by another app. Close it and try again, or use the code entry below.";
      } else if (err.name === "OverconstrainedError") {
        message = "Could not access rear camera. Try again or use the code entry below.";
      } else if (err.name === "TypeError") {
        message = "Camera requires HTTPS. Use the code entry below.";
      }
      captureRuntimeError(err, { subsystem: "UI", category: "camera_access_failure", component: "ScanQR", metadata: { errorName: err.name } });
      setCameraError(message);
      setScanning(false);
    }
  };

  // ── Scan handler ───────────────────────────────────────────────────────

  const handleScan = async (rawCode) => {
    setErrorMsg("");

    // Security: validate QR payload before any processing
    const qrCheck = validateQRPayload(rawCode);
    if (!qrCheck.valid) {
      setErrorMsg(qrCheck.reason || "Invalid or unreadable scan format. Please try again.");
      return;
    }
    const code = qrCheck.sanitized;

    const parts = code.split(":");
    // Format: boothbridge:connect:userId:role
    if (parts.length !== 4 || parts[0] !== "boothbridge") {
      setErrorMsg("Invalid code format. Please scan or enter an exhibitor QR code.");
      return;
    }

    const targetId = parts[2];
    const targetRole = parts[3];

    if (targetRole !== "exhibitor") {
      setErrorMsg("This QR code doesn't belong to an exhibitor booth.");
      return;
    }

    // Always show the booth immediately — don't block on network
    setBoothUserId(targetId);

    // Only attempt connection tracking for buyers
    if (user?.user_role !== "buyer") return;

    setProcessing(true);

    if (!navigator.onLine) {
      // ── OFFLINE PATH ────────────────────────────────────────────────
      await enqueueScan({
        targetId,
        targetRole,
        scannedByUserId: user.id,
        scannedByName: user.full_name,
        timestamp: new Date().toISOString(),
      });
      await refreshPendingCount();
      toast({
        title: "Scan Saved Offline",
        description: "Booth visit saved locally. Will sync when you're back online.",
      });
      setProcessing(false);
      return;
    }

    // ── ONLINE PATH ──────────────────────────────────────────────────
    try {
      const existing = await db.Connection.filter({
        exhibitor_user_id: targetId,
        buyer_user_id: user.id,
      });

      if (existing.length === 0) {
        const exProfiles = await db.ExhibitorProfile.filter({ user_id: targetId });
        const exProfile = exProfiles[0];

        await db.Connection.create({
          exhibitor_user_id: targetId,
          buyer_user_id: user.id,
          status: "accepted",
          initiated_by: "buyer",
          exhibitor_name: exProfile?.digital_card?.name || exProfile?.company_name || "",
          exhibitor_company: exProfile?.company_name || "",
          booth_number: exProfile?.booth_number || "",
          event_name: exProfile?.event_name || "",
          buyer_name: user.full_name,
        });

        await db.Notification.create({
          user_id: targetId,
          type: "connection_accepted",
          title: "Booth Visit",
          message: `${user.full_name} visited your digital booth.`,
          from_user_name: user.full_name,
        });
      }
    } catch (networkErr) {
      captureRuntimeError(networkErr, {
        subsystem: "NETWORK",
        category: "connection_track_failure",
        component: "ScanQR",
        metadata: { targetId, offlineQueued: true },
      });
      await enqueueScan({
        targetId,
        targetRole,
        scannedByUserId: user.id,
        scannedByName: user.full_name,
        timestamp: new Date().toISOString(),
      });
      await refreshPendingCount();
      toast({
        title: "Saved for Later Sync",
        description: "Booth visit queued — will sync when connection stabilises.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualId.trim()) handleScan(manualId.trim());
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (boothUserId) {
    return <DigitalBooth exhibitorUserId={boothUserId} onBack={() => setBoothUserId(null)} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">

      {/* Offline / pending banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
          <WifiOff className="w-4 h-4 shrink-0" />
          Offline Mode — scans are saved locally and will sync automatically.
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium">
          <CloudUpload className="w-4 h-4 shrink-0 animate-pulse" />
          Syncing {pendingCount} offline scan{pendingCount > 1 ? "s" : ""}…
        </div>
      )}

      <h1 className="text-2xl font-display font-bold mb-2">Visit a Booth</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Scan an exhibitor's QR code to instantly access their digital booth, catalogs, and products.
      </p>

      {/* Camera scanner */}
      <Card className="p-4 text-center mb-6 bg-primary/5 border-primary/20">
        <div className="w-full max-w-xs mx-auto aspect-square bg-black rounded-xl overflow-hidden relative mb-4">
          {cameraActive ? (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/70 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>
              </div>
              <button onClick={stopCamera} className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">Stop</button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <Camera className="w-12 h-12 opacity-50 mb-2" />
              <p className="text-sm opacity-70">Camera preview</p>
            </div>
          )}
        </div>

        {cameraError && <p className="text-xs text-destructive mb-2">{cameraError}</p>}

        {!cameraActive ? (
          <Button onClick={startCamera} disabled={scanning} className="w-full max-w-xs">
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
            {scanning ? "Starting camera..." : "Start Camera Scanner"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            {processing ? (
              <span className="flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Processing scan…</span>
            ) : "Point camera at a BoothBridge QR code"}
          </p>
        )}
      </Card>

      {/* Manual entry */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold">Enter Booth Code</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Booth Code</Label>
            <Input
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
              placeholder="boothbridge:connect:abc123:exhibitor"
              className="font-mono text-sm mt-1"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleManualSubmit}
            disabled={!manualId || processing}
          >
            {processing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
              : <><Building2 className="w-4 h-4 mr-2" /> Open Digital Booth</>
            }
          </Button>

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}