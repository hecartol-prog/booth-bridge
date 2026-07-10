/**
 * RC10.6 — Sentry environment and release configuration.
 */

/** @returns {boolean} */
export function isSentryEnabled() {
  return Boolean(import.meta.env.VITE_SENTRY_DSN);
}

export function getSentryEnvironment() {
  if (import.meta.env.VITE_SENTRY_ENVIRONMENT) {
    return import.meta.env.VITE_SENTRY_ENVIRONMENT;
  }
  if (import.meta.env.DEV) return "development";
  if (import.meta.env.MODE === "preview") return "preview";
  return "production";
}

export function getSentryRelease() {
  if (import.meta.env.VITE_SENTRY_RELEASE) {
    return import.meta.env.VITE_SENTRY_RELEASE;
  }
  const buildInfo = typeof __BB_BUILD_INFO__ !== "undefined" ? __BB_BUILD_INFO__ : null;
  const version = buildInfo?.version || import.meta.env.VITE_APP_VERSION || "0.0.0";
  const commit = buildInfo?.commit || "unknown";
  return `booth-bridge@${version}+${commit}`;
}

export function getBuildInfo() {
  return typeof __BB_BUILD_INFO__ !== "undefined"
    ? __BB_BUILD_INFO__
    : { version: "0.0.0", commit: "unknown", timestamp: null };
}

export function getDeviceContext() {
  const ua = navigator.userAgent;
  let browser = "unknown";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";

  return { browser, os, device };
}
