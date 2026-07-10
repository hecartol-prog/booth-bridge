/**
 * RC10.6 — Secure debug console access gate (Supabase auth only).
 *
 * No custom debug password. Access requires an authenticated Supabase session
 * plus administrator authorization rules below.
 */

const SUPPORT_ADMIN_EMAIL = "support@boothbridge.app";

/**
 * Emergency lock — blocks console for everyone including administrators.
 */
export function isDebugConsoleEmergencyLocked() {
  return import.meta.env.VITE_DISABLE_DEBUG_CONSOLE === "true";
}

/**
 * @param {{ id?: string, email?: string, role?: string, is_debug_admin?: boolean, user_metadata?: Record<string, unknown>, app_metadata?: Record<string, unknown> } | null | undefined} user
 */
export function isDebugAdminMetadata(user) {
  if (!user) return false;
  if (user.is_debug_admin === true) return true;
  if (user.user_metadata?.is_debug_admin === true) return true;
  if (user.app_metadata?.is_debug_admin === true) return true;
  return false;
}

/**
 * @param {{ email?: string, role?: string } | null | undefined} user
 */
export function isSupportConsoleAdmin(user) {
  if (!user?.email || !user?.role) return false;
  return (
    user.email.toLowerCase() === SUPPORT_ADMIN_EMAIL &&
    String(user.role).toLowerCase() === "admin"
  );
}

/**
 * Local-only override when explicitly enabled.
 */
export function isLocalDebugModeEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_DEBUG_MODE === "true";
}

/**
 * @param {{ id?: string, email?: string, role?: string, is_debug_admin?: boolean, user_metadata?: Record<string, unknown>, app_metadata?: Record<string, unknown> } | null | undefined} user
 * @param {boolean} [isAuthenticated=false]
 */
export function getDebugAccess(user, isAuthenticated = false) {
  if (isDebugConsoleEmergencyLocked()) {
    return {
      allowed: false,
      reason: "emergency_lock",
      permissions: [],
    };
  }

  if (!isAuthenticated || !user?.id) {
    return {
      allowed: false,
      reason: "unauthenticated",
      permissions: [],
    };
  }

  const permissions = [];

  if (isSupportConsoleAdmin(user)) {
    permissions.push("support_admin");
  }
  if (isDebugAdminMetadata(user)) {
    permissions.push("debug_admin_metadata");
  }
  if (isLocalDebugModeEnabled()) {
    permissions.push("local_debug_mode");
  }

  return {
    allowed: permissions.length > 0,
    reason: permissions[0] || "denied",
    permissions,
  };
}

/**
 * @param {{ id?: string, email?: string, role?: string, is_debug_admin?: boolean, user_metadata?: Record<string, unknown>, app_metadata?: Record<string, unknown> } | null | undefined} user
 * @param {boolean} [isAuthenticated=false]
 */
export function isDebugConsoleEnabled(user, isAuthenticated = false) {
  return getDebugAccess(user, isAuthenticated).allowed;
}

export function getEnvironmentLabel() {
  if (import.meta.env.DEV) return "Development";
  if (import.meta.env.MODE === "preview") return "Preview";
  return "Production";
}
