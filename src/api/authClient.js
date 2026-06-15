/**
 * authClient — authentication abstraction (Base44 today, Supabase in Phase 5).
 *
 * Pages should import this module in Phase 2 instead of base44.auth directly.
 * Phase 1: implemented but not wired into AuthContext or pages.
 */

import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { createAxiosClient } from "@base44/sdk/dist/utils/axios-client";
import { isBase44 } from "@/config/backend";

function supabaseNotReady(method) {
  throw new Error(
    `[authClient] ${method} is not available until Phase 5. Use VITE_DATA_BACKEND=base44.`
  );
}

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

// ── Public API ─────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  if (isBase44()) return base44GetCurrentUser();
  supabaseNotReady("getCurrentUser");
}

export async function loginWithEmailPassword(email, password) {
  if (isBase44()) return base44.auth.loginViaEmailPassword(email, password);
  supabaseNotReady("loginWithEmailPassword");
}

export function loginWithProvider(provider, redirectPath = "/") {
  if (isBase44()) return base44.auth.loginWithProvider(provider, redirectPath);
  supabaseNotReady("loginWithProvider");
}

export async function register({ email, password }) {
  if (isBase44()) return base44.auth.register({ email, password });
  supabaseNotReady("register");
}

export async function verifyOtp(email, token) {
  if (isBase44()) {
    if (typeof base44.auth.verifyOtp === "function") {
      return base44.auth.verifyOtp(email, token);
    }
    if (typeof base44.auth.confirmSignUp === "function") {
      return base44.auth.confirmSignUp(email, token);
    }
    throw new Error("OTP verification not supported by current Base44 SDK");
  }
  supabaseNotReady("verifyOtp");
}

export async function requestPasswordReset(email) {
  if (isBase44()) return base44.auth.resetPasswordRequest(email);
  supabaseNotReady("requestPasswordReset");
}

export async function updatePassword(newPassword) {
  if (isBase44()) {
    if (typeof base44.auth.updatePassword === "function") {
      return base44.auth.updatePassword(newPassword);
    }
    throw new Error("Password update not supported by current Base44 SDK");
  }
  supabaseNotReady("updatePassword");
}

export async function updateUserMetadata(fields) {
  if (isBase44()) return base44.auth.updateMe(fields);
  supabaseNotReady("updateUserMetadata");
}

export function logout(redirectUrl) {
  if (isBase44()) {
    if (redirectUrl) return base44.auth.logout(redirectUrl);
    return base44.auth.logout();
  }
  supabaseNotReady("logout");
}

export function redirectToLogin(returnUrl) {
  if (isBase44()) return base44.auth.redirectToLogin(returnUrl);
  supabaseNotReady("redirectToLogin");
}

export function onAuthStateChange(callback) {
  if (isBase44()) {
    if (typeof base44.auth.onAuthStateChange === "function") {
      return base44.auth.onAuthStateChange(callback);
    }
    return () => {};
  }
  supabaseNotReady("onAuthStateChange");
}

export async function checkAppReady() {
  if (isBase44()) return base44CheckAppReady();
  supabaseNotReady("checkAppReady");
}

export async function adminLogin(email, password) {
  if (isBase44()) {
    return base44.functions.invoke("adminAuth", { email, password });
  }
  supabaseNotReady("adminLogin");
}

export function isAdminSession() {
  if (isBase44()) {
    return sessionStorage.getItem("bb_admin_authed") === "true";
  }
  supabaseNotReady("isAdminSession");
}

/** Default export object for convenient destructuring in Phase 2 */
export const auth = {
  getCurrentUser,
  loginWithEmailPassword,
  loginWithProvider,
  register,
  verifyOtp,
  requestPasswordReset,
  updatePassword,
  updateUserMetadata,
  logout,
  redirectToLogin,
  onAuthStateChange,
  checkAppReady,
  adminLogin,
  isAdminSession,
};
