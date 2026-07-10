/**
 * authClient — authentication abstraction (Supabase-only).
 *
 * All auth flows route through supabaseAuth.js. Pages and AuthContext import
 * this module only — never call provider SDK auth clients directly.
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import * as supabaseAuth from "@/api/supabaseAuth";
import { sentryBreadcrumbs } from "@/monitoring/sentryBreadcrumbs";
import { captureRuntimeError } from "@/monitoring/sentryErrors";

// ── Canonical public API ─────────────────────────────────────────────────────

/** @alias loginWithEmailPassword */
export async function login(email, password) {
  return loginWithEmailPassword(email, password);
}

export async function loginWithEmailPassword(email, password) {
  try {
    const result = await supabaseAuth.supabaseLogin(email, password);
    sentryBreadcrumbs.login(result?.id);
    return result;
  } catch (error) {
    captureRuntimeError(error, { subsystem: "AUTH", category: "login_failure" });
    throw error;
  }
}

export function logout(redirectUrl) {
  sentryBreadcrumbs.logout();
  supabaseAuth.supabaseLogout().then(() => {
    if (redirectUrl && typeof window !== "undefined") {
      window.location.href = redirectUrl;
    }
  });
}

export async function register(payload) {
  try {
    const result = await supabaseAuth.supabaseRegister(payload);
    sentryBreadcrumbs.register(payload?.email);
    return result;
  } catch (error) {
    captureRuntimeError(error, { subsystem: "AUTH", category: "registration_failure" });
    throw error;
  }
}

/**
 * Request password-reset email (string) or complete reset (object with token).
 * @param {string|{ resetToken?: string, newPassword: string }} emailOrPayload
 * @param {string} [newPassword]
 */
export async function resetPassword(emailOrPayload, newPassword) {
  if (typeof emailOrPayload === "string") {
    return requestPasswordReset(emailOrPayload);
  }
  const payload =
    emailOrPayload && typeof emailOrPayload === "object"
      ? emailOrPayload
      : { resetToken: emailOrPayload, newPassword };
  if (!payload.resetToken || !payload.newPassword) {
    throw new Error("resetToken and newPassword are required to complete password reset");
  }
  const resetPayload = /** @type {{ resetToken: string, newPassword: string }} */ ({
    resetToken: payload.resetToken,
    newPassword: payload.newPassword,
  });
  return supabaseAuth.supabaseCompletePasswordReset(resetPayload);
}

export async function updatePassword(newPassword) {
  return supabaseAuth.supabaseUpdatePassword(newPassword);
}

/** @alias getCurrentUser */
export async function currentUser() {
  return getCurrentUser();
}

export async function getCurrentUser() {
  return supabaseAuth.supabaseGetCurrentUser();
}

export async function currentSession() {
  return supabaseAuth.supabaseGetSession();
}

export async function refresh() {
  return supabaseAuth.supabaseRefresh();
}

export function onAuthStateChange(callback) {
  return supabaseAuth.supabaseOnAuthStateChange(callback);
}

export function signInWithGoogle(redirectPath = "/") {
  // Reserved for Phase 2 (post-MVP).
  return loginWithProvider("google", redirectPath);
}

export function signInWithLinkedIn(redirectPath = "/") {
  // Reserved for Phase 2 (post-MVP).
  return loginWithProvider("linkedin", redirectPath);
}

export function loginWithProvider(provider, redirectPathAfter = "/") {
  // Reserved for Phase 2 (post-MVP): keep abstraction stable without MVP runtime callers.
  return supabaseAuth.supabaseSignInWithOAuth(provider, redirectPathAfter);
}

export async function isAuthenticated() {
  return supabaseAuth.supabaseIsAuthenticated();
}

export async function isAdmin() {
  return supabaseAuth.supabaseIsAdmin();
}

export async function getAccessToken() {
  return supabaseAuth.supabaseGetAccessToken();
}

// ── Extended API (backward compatible) ─────────────────────────────────────

export async function verifyOtp(emailOrPayload, token) {
  return supabaseAuth.supabaseVerifyOtp(emailOrPayload, token);
}

export async function setToken(access_token) {
  if (!access_token) return;
  const { error } = await getSupabaseClient().auth.setSession({
    access_token,
    refresh_token: "",
  });
  if (error) throw error;
}

export async function resendOtp(email) {
  return supabaseAuth.supabaseResendOtp(email);
}

export async function requestPasswordReset(email) {
  return supabaseAuth.supabaseRequestPasswordReset(email);
}

export async function updateUserMetadata(fields) {
  return supabaseAuth.supabaseUpdateUserMetadata(fields);
}

export async function completeOnboarding({ user_role, profile_id }) {
  return supabaseAuth.supabaseCompleteOnboarding({ user_role, profile_id });
}

export async function getAppUserOnboardingState(userId) {
  return supabaseAuth.fetchAppUserOnboardingState(userId);
}

export async function refreshCurrentUser() {
  await supabaseAuth.supabaseRefresh();
  return supabaseAuth.supabaseGetCurrentUser();
}

export async function ensureAppUser() {
  const user = await supabaseAuth.supabaseGetCurrentUser();
  if (!user?.id) throw new Error("Not authenticated");
  await supabaseAuth.ensureAppUserRow(user.id);
  return user;
}

export function redirectToLogin(returnUrl) {
  return supabaseAuth.supabaseRedirectToLogin(returnUrl);
}

export async function checkAppReady() {
  return supabaseAuth.supabaseCheckAppReady();
}

/** @returns {Promise<{ data?: { success?: boolean } }>} */
export async function adminLogin(email, password) {
  return supabaseAuth.supabaseAdminLogin(email, password);
}

export function isAdminSession() {
  return sessionStorage.getItem("bb_admin_authed") === "true";
}

export function clearAdminSession() {
  sessionStorage.removeItem("bb_admin_authed");
}

// ── Default export ─────────────────────────────────────────────────────────

export const auth = {
  login,
  logout,
  register,
  resetPassword,
  updatePassword,
  currentUser,
  currentSession,
  refresh,
  onAuthStateChange,
  signInWithGoogle,
  signInWithLinkedIn,
  isAuthenticated,
  isAdmin,
  getAccessToken,
  getCurrentUser,
  loginWithEmailPassword,
  loginWithProvider,
  verifyOtp,
  setToken,
  resendOtp,
  requestPasswordReset,
  updateUserMetadata,
  completeOnboarding,
  getAppUserOnboardingState,
  refreshCurrentUser,
  ensureAppUser,
  redirectToLogin,
  checkAppReady,
  adminLogin,
  isAdminSession,
  clearAdminSession,
};
