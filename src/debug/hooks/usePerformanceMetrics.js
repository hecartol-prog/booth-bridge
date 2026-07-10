import { useEffect, useState } from "react";

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number|null} fps
 * @property {number|null} memoryMb
 * @property {number|null} jsHeapMb
 * @property {number|null} lcp
 * @property {number|null} cpuEstimate
 */

export function usePerformanceMetrics() {
  /** @type {[PerformanceMetrics, (m: PerformanceMetrics) => void]} */
  const [metrics, setMetrics] = useState({
    fps: null,
    memoryMb: null,
    jsHeapMb: null,
    lcp: null,
    cpuEstimate: null,
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now) => {
      frameCount += 1;
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;

        /** @type {PerformanceMetrics} */
        const next = { fps, memoryMb: null, jsHeapMb: null, lcp: null, cpuEstimate: null };

        const perf = /** @type {Performance & { memory?: { usedJSHeapSize: number, totalJSHeapSize: number } }} */ (
          performance
        );
        if (perf.memory) {
          next.jsHeapMb = Math.round(perf.memory.usedJSHeapSize / 1048576);
          next.memoryMb = Math.round(perf.memory.totalJSHeapSize / 1048576);
        }

        setMetrics((prev) => ({ ...prev, ...next }));
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    let lcpObserver;
    try {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          setMetrics((prev) => ({ ...prev, lcp: Math.round(last.startTime) }));
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* LCP not supported */
    }

    return () => {
      cancelAnimationFrame(rafId);
      lcpObserver?.disconnect();
    };
  }, []);

  return metrics;
}
