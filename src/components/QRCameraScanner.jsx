import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dynamically load jsQR from CDN
let jsQR = null;
const loadJsQR = () =>
  new Promise((resolve) => {
    if (jsQR) return resolve(jsQR);
    if (window.jsQR) { jsQR = window.jsQR; return resolve(jsQR); }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.onload = () => { jsQR = window.jsQR; resolve(jsQR); };
    document.head.appendChild(script);
  });

export default function QRCameraScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | active | denied | error
  const [error, setError] = useState("");

  const startCamera = async () => {
    setStatus("loading");
    setError("");
    await loadJsQR();
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Camera not supported on this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus("active");
        scanLoop();
      }
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setStatus("denied");
        setError("Camera permission denied. Please allow camera access and try again.");
      } else {
        setStatus("error");
        setError("Could not access camera: " + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStatus("idle");
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !jsQR) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code?.data) {
        stopCamera();
        onScan(code.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-xs aspect-square bg-black rounded-2xl overflow-hidden border-2 border-primary/30 mb-4">
        {status === "active" ? (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/60 rounded-xl relative">
                <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl" />
                <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr" />
                <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl" />
                <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white rounded-br" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-400/70 animate-pulse" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/60">
            {status === "loading" ? (
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            ) : (
              <Camera className="w-14 h-14 opacity-40" />
            )}
            {status === "idle" && <p className="text-sm text-center px-4">Tap below to start scanning</p>}
            {status === "loading" && <p className="text-sm">Starting camera...</p>}
            {(status === "denied" || status === "error") && (
              <p className="text-xs text-red-400 text-center px-4">{error}</p>
            )}
          </div>
        )}
      </div>

      {status === "active" ? (
        <Button variant="outline" onClick={stopCamera} className="gap-2">
          <CameraOff className="w-4 h-4" /> Stop Camera
        </Button>
      ) : (
        <Button onClick={startCamera} disabled={status === "loading"} className="gap-2">
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {status === "loading" ? "Starting..." : "Start Camera"}
        </Button>
      )}
    </div>
  );
}