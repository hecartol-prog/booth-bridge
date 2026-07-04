/**
 * authClient — authentication abstraction (Phase 7.4B).
 *
 * Routes through Base44 when VITE_DATA_BACKEND=base44 (default).
 * Routes through Supabase when VITE_DATA_BACKEND=supabase.
 *
 * Pages and AuthContext import this module only — never base44.auth directly.
 */

import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { createAxiosClient } from "@base44/sdk/dist/utils/axios-client";
import { isBase44 } from "@/config/backend";
import { getSupabaseClient } from "@/api/supabaseClient";
import * as supabaseAuth from "@/api/supabaseAuth";

// ── Base44 implementations ─────────────────────────────────────────────────

async function base44GetCurrentUser() {
  return base44.auth.me();
}

async function base44CheckAppReady() {
  const appClient = createAxiosClient({
    baseURL: `/api/apps/public`,
    headers: { "X-App-Id": appParams.appId },
    token: appParams.token,
    interceptResponses: true,
  });
  return appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
}

async function base44IsAuthenticated() {
  try {
    await base44.auth.me();
    return true;
  } catch {
    return !!appParams.token;
  }
}

async function base44GetSession() {
  return appParams.token ? { access_token: appParams.token } : null;
}

async function base44GetAccessToken() {
  return appParams.token || null;
}

async function base44Refresh() {
  if (typeof base44.auth.refresh === "function") {
    return base44.auth.refresh();
  }
  return base44GetSession();
}

// ── Canonical public API (Phase 7.4B) ────────────────────────────────────────

/** @alias loginWithEmailPassword */
export async function login(email, password) {
  return loginWithEmailPassword(email, password);
}

export async function loginWithEmailPassword(email, password) {
  if (isBase44()) return base44.auth.loginViaEmailPassword(email, password);
  return supabaseAuth.supabaseLogin(email, password);
}

export function logout(redirectUrl) {
  if (isBase44()) {
    if (redirectUrl) return base44.auth.logout(redirectUrl);
    return base44.auth.logout();
  }
  supabaseAuth.supabaseLogout().then(() => {
    if (redirectUrl && typeof window !== "undefined") {
      window.location.href = redirectUrl;
    }
  });
}

export async function register(payload) {
  if (isBase44()) return base44.auth.register(payload);
  return supabaseAuth.supabaseRegister(payload);
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
  if (isBase44()) {
    if (typeof base44.auth.resetPassword === "function") {
      return base44.auth.resetPassword(payload);
    }
    throw new Error("resetPassword not supported by current Base44 SDK");
  }
  return supabaseAuth.supabaseCompletePasswordReset(payload);
}

export async function updatePassword(newPassword) {
  if (isBase44()) {
    if (typeof base44.auth.updatePassword === "function") {
      return base44.auth.updatePassword(newPassword);
    }
    throw new Error("Password update not supported by current Base44 SDK");
  }
  return supabaseAuth.supabaseUpdatePassword(newPassword);
}

/** @alias getCurrentUser */
export async function currentUser() {
  return getCurrentUser();
}

export async function getCurrentUser() {
  if (isBase44()) return base44GetCurrentUser();
  return supabaseAuth.supabaseGetCurrentUser();
}

export async function currentSession() {
  if (isBase44()) return base44GetSession();
  return supabaseAuth.supabaseGetSession();
}

export async function refresh() {
  if (isBase44()) return base44Refresh();
  return supabaseAuth.supabaseRefresh();
}

export function onAuthStateChange(callback) {
  if (isBase44()) {
    if (typeof base44.auth.onAuthStateChange === "function") {
      return base44.auth.onAuthStateChange(callback);
    }
    return () => {};
  }
  return supabaseAuth.supabaseOnAuthStateChange(callback);
}

export function signInWithGoogle(redirectPath = "/") {
  return signInWithProvider("google", redirectPath);
}

export function signInWithLinkedIn(redirectPath = "/") {
  return signInWithProvider("linkedin", redirectPath);
}

export function loginWithProvider(provider, redirectPathAfter = "/") {
  if (isBase44()) return base44.auth.loginWithProvider(provider, redirectPathAfter);
  return supabaseAuth.supabaseSignInWithOAuth(provider, redirectPathAfter);
}

export async function isAuthenticated() {
  if (isBase44()) return base44IsAuthenticated();
  return supabaseAuth.supabaseIsAuthenticated();
}

export async function isAdmin() {
  if (isBase44()) return isAdminSession();
  return supabaseAuth.supabaseIsAdmin();
}

export async function getAccessToken() {
  if (isBase44()) return base44GetAccessToken();
  return supabaseAuth.supabaseGetAccessToken();
}

// ── Extended API (backward compatible) ─────────────────────────────────────

export async function verifyOtp(emailOrPayload, token) {
  if (isBase44()) {
    const isObjectPayload =
      emailOrPayload !== null &&
      typeof emailOrPayload === "object" &&
      !Array.isArray(emailOrPayload);

    if (typeof base44.auth.verifyOtp === "function") {
      if (isObjectPayload) return base44.auth.verifyOtp(emailOrPayload);
      return base44.auth.verifyOtp(emailOrPayload, token);
    }
    if (typeof base44.auth.confirmSignUp === "function") {
      const email = isObjectPayload ? emailOrPayload.email : emailOrPayload;
      const otpCode = isObjectPayload ? emailOrPayload.otpCode : token;
      return base44.auth.confirmSignUp(email, otpCode);
    }
    throw new Error("OTP verification not supported by current Base44 SDK");
  }
  return supabaseAuth.supabaseVerifyOtp(emailOrPayload, token);
}

export async function setToken(access_token) {
  if (isBase44()) {
    if (typeof base44.auth.setToken === "function") {
      return base44.auth.setToken(access_token);
    }
    throw new Error("setToken not supported by current Base44 SDK");
  }
  if (!access_token) return;
  const { error } = await getSupabaseClient().auth.setSession({
    access_token,
    refresh_token: "",
  });
  if (error) throw error;
}

export async function resendOtp(email) {
  if (isBase44()) {
    if (typeof base44.auth.resendOtp === "function") {
      return base44.auth.resendOtp(email);
    }
    throw new Error("resendOtp not supported by current Base44 SDK");
  }
  return supabaseAuth.supabaseResendOtp(email);
}

export async function requestPasswordReset(email) {
  if (isBase44()) return base44.auth.resetPasswordRequest(email);
  return supabaseAuth.supabaseRequestPasswordReset(email);
}

export async function updateUserMetadata(fields) {
  if (isBase44()) return base44.auth.updateMe(fields);
  return supabaseAuth.supabaseUpdateUserMetadata(fields);
}

export function redirectToLogin(returnUrl) {
  if (isBase44()) return base44.auth.redirectToLogin(returnUrl);
  return supabaseAuth.supabaseRedirectToLogin(returnUrl);
}

export async function checkAppReady() {
  if (isBase44()) return base44CheckAppReady();
  return supabaseAuth.supabaseCheckAppReady();
}

/** @returns {Promise<{ data?: { success?: boolean } }>} */
export async function adminLogin(email, password) {
  if (isBase44()) {
    const response = await base44.functions.invoke("adminAuth", { email, password });
    if (response?.data?.success) {
      sessionStorage.setItem("bb_admin_authed", "true");
    }
    return response;
  }
  return supabaseAuth.supabaseAdminLogin(email, password);
}

export function isAdminSession() {
  return isBase44() ? sessionStorage.getItem("bb_admin_authed") === "true" : false;
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
  redirectToLogin,
  checkAppReady,
  adminLogin,
  isAdminSession,
  clearAdminSession,
};
