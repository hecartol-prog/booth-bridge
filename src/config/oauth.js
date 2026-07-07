/**
 * OAuth redirect and Google provider helpers.
 *
 * Google Client ID + Secret live in Supabase Dashboard (not in frontend code).
 * VITE_GOOGLE_CLIENT_ID is optional — documents the Web client ID for operators
 * and enables dev-time configuration hints.
 */

/** Browser origin first so www vs apex matches the active host. */
export function getAuthRedirectOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL || "";
}

/** Absolute post-auth URL registered in Supabase Auth → URL Configuration. */
export function buildOAuthRedirectTo(path = "/") {
  const origin = getAuthRedirectOrigin();
  if (!origin) {
    throw new Error(
      "OAuth redirect origin is unknown. Set VITE_APP_URL or run in a browser."
    );
  }
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

/** Paste into Google Cloud → Authorized redirect URIs. */
export function getSupabaseAuthCallbackUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/auth/v1/callback`;
}

/** Web client ID from env (must match first ID in Supabase Google provider settings). */
export function getGoogleWebClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || null;
}

/** signInWithOAuth options for Google (web application client). */
export function getGoogleOAuthOptions(redirectTo) {
  return {
    redirectTo,
    queryParams: {
      access_type: "online",
      prompt: "select_account",
    },
    scopes: "openid email profile",
  };
}

/** LinkedIn OIDC options. */
export function getLinkedInOAuthOptions(redirectTo) {
  return { redirectTo };
}

/**
 * Turn Supabase/Google OAuth failures into actionable operator messages.
 * @param {import('@supabase/supabase-js').AuthError} error
 * @param {string} provider
 */
export function formatOAuthError(error, provider = "google") {
  const message = error?.message || "OAuth sign-in failed";
  const lower = message.toLowerCase();
  const callback = getSupabaseAuthCallbackUrl();
  const origin = getAuthRedirectOrigin();
  const clientId = getGoogleWebClientId();

  if (provider === "google") {
    if (
      lower.includes("redirect") ||
      lower.includes("uri") ||
      lower.includes("invalid_request")
    ) {
      return [
        "Google OAuth redirect configuration mismatch.",
        callback
          ? `In Google Cloud Console (Web client), set Authorized redirect URI to: ${callback}`
          : null,
        origin
          ? `Add Authorized JavaScript origin: ${origin}`
          : null,
        "In Supabase Dashboard → Auth → URL Configuration, allow:",
        origin ? `  ${origin}/**` : null,
        clientId
          ? `Ensure Web client ID ${clientId} is first in Supabase → Auth → Google → Client IDs.`
          : "Set VITE_GOOGLE_CLIENT_ID to your Web client ID for clearer deploy checks.",
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
      return [
        "Google sign-in is not enabled on the Supabase project.",
        clientId
          ? `Enable Google provider and paste client ID ${clientId} + secret in Supabase Dashboard.`
          : "Enable Google provider in Supabase Dashboard → Authentication → Providers.",
      ].join("\n");
    }
  }

  return message;
}
