/** Lazy-load jsQR from CDN (Safari / browsers without BarcodeDetector). */

let jsQR = null;

export function loadJsQR() {
  return new Promise((resolve) => {
    if (jsQR) return resolve(jsQR);
    if (typeof window !== "undefined" && window.jsQR) {
      jsQR = window.jsQR;
      return resolve(jsQR);
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.onload = () => {
      jsQR = window.jsQR;
      resolve(jsQR);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}
