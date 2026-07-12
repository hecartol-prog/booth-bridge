/**
 * Supabase authentication implementation (Phase 7.4B).
 * Internal module — consumed by authClient.js only.
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import { buildAppUserModel } from "@/api/appUserModel";
import {
  buildOAuthRedirectTo,
  formatOAuthError,
  getGoogleOAuthOptions,
  getLinkedInOAuthOptions,
} from "@/config/oauth";

const ADMIN_ROLES = new Set(["admin", "superadmin", "systemadmin", "supportadmin"]);

function redirectPath(path = "/") {
  return buildOAuthRedirectTo(path);
}

/** Lightweight read of onboarding fields from public.user (source of truth). */
export async function fetchAppUserOnboardingState(userId) {
  if (!userId) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user")
    .select("user_role, onboarded, profile_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Map Supabase auth user + public.user row to app user model. */
export async function mergeAppUser(authUser) {
  if (!authUser) return null;

  const supabase = getSupabaseClient();
  const { data: appRow, error } = await supabase
    .from("user")
    .select("user_role, onboarded, profile_id")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error) throw error;

  return buildAppUserModel(authUser, appRow);
}

export function isAdminRole(user) {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  return ADMIN_ROLES.has(role);
}

async function syncAppUserRow(userId, fields) {
  const supabase = getSupabaseClient();
  const patch = {};
  if (fields.user_role !== undefined) patch.user_role = fields.user_role;
  if (fields.onboarded !== undefined) patch.onboarded = fields.onboarded;
  if (fields.profile_id !== undefined) patch.profile_id = fields.profile_id;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("user").upsert({ id: userId, ...patch }, { onConflict: "id" });
  if (error) throw error;
}

/** Ensure public.user exists for the authenticated auth.users id (required for profile FKs). */
export async function ensureAppUserRow(userId) {
  if (!userId) return;
  const supabase = getSupabaseClient();

  const { error: rpcError } = await supabase.rpc("ensure_app_user");
  if (!rpcError) {
    const { data: row, error: readError } = await supabase
      .from("user")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!readError && row?.id) return;
  }

  const { error: upsertError } = await supabase
    .from("user")
    .upsert({ id: userId }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const { data: verified, error: verifyError } = await supabase
    .from("user")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (verifyError) throw verifyError;
  if (!verified?.id) {
    throw new Error(
      "Could not create your app user record. Please sign out, sign in again, and retry."
    );
  }
}

export async function supabaseGetCurrentUser() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) return null;
  return mergeAppUser(data.user);
}

export async function supabaseGetSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function supabaseIsAuthenticated() {
  const session = await supabaseGetSession();
  return !!session;
}

export async function supabaseGetAccessToken() {
  const session = await supabaseGetSession();
  return session?.access_token ?? null;
}

export async function supabaseLogin(email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await ensureAppUserRow(data.user.id);
  return mergeAppUser(data.user);
}

export async function supabaseRegister({
  email,
  password,
  firstName,
  lastName,
  company,
  jobTitle,
  phone,
  country,
}) {
  const supabase = getSupabaseClient();
  const metadata = {
    first_name: firstName || "",
    last_name: lastName || "",
    company: company || "",
    job_title: jobTitle || "",
    phone: phone || "",
    country: country || "",
  };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectPath("/"),
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
}

export async function supabaseVerifyOtp(emailOrPayload, token) {
  const supabase = getSupabaseClient();
  const isObject =
    emailOrPayload !== null &&
    typeof emailOrPayload === "object" &&
    !Array.isArray(emailOrPayload);

  const email = isObject ? emailOrPayload.email : emailOrPayload;
  const otpCode = isObject ? emailOrPayload.otpCode : token;

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otpCode,
    type: "signup",
  });
  if (error) throw error;
  if (data.user?.id) await ensureAppUserRow(data.user.id);
  return {
    access_token: data.session?.access_token,
    user: data.user ? await mergeAppUser(data.user) : null,
  };
}

export async function supabaseResendOtp(email) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}

export async function supabaseRequestPasswordReset(email) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectPath("/reset-password"),
  });
  if (error) throw error;
}

export async function supabaseCompletePasswordReset({ resetToken, newPassword }) {
  const supabase = getSupabaseClient();

  if (resetToken) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: resetToken,
      type: "recovery",
    });
    if (verifyError) throw verifyError;
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function supabaseUpdatePassword(newPassword) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Persist onboarding-related app state to public.user only.
 * Onboarding fields are NOT written to user_metadata (RC10.7 — avoids JWT staleness).
 */
export async function supabaseCompleteOnboarding({ user_role, profile_id }) {
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Not authenticated");

  await syncAppUserRow(userData.user.id, {
    user_role,
    onboarded: true,
    profile_id,
  });

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;

  const authUser = refreshData.session?.user ?? userData.user;
  return mergeAppUser(authUser);
}

/** @deprecated Prefer completeOnboarding — kept for backward-compatible call sites. */
export async function supabaseUpdateUserMetadata(fields) {
  const hasOnboardingFields =
    fields.user_role !== undefined ||
    fields.onboarded !== undefined ||
    fields.profile_id !== undefined;

  if (hasOnboardingFields) {
    return supabaseCompleteOnboarding({
      user_role: fields.user_role,
      profile_id: fields.profile_id,
    });
  }

  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Not authenticated");
  return mergeAppUser(userData.user);
}

export async function supabaseLogout() {
  const supabase = getSupabaseClient();
  sessionStorage.removeItem("bb_admin_authed");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function supabaseRedirectToLogin(returnUrl) {
  const target = returnUrl
    ? `/login?from_url=${encodeURIComponent(returnUrl)}`
    : "/login";
  if (typeof window !== "undefined") {
    window.location.href = target;
  }
}

export function supabaseOnAuthStateChange(callback) {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export async function supabaseRefresh() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data.session;
}

export async function supabaseSignInWithOAuth(provider, redirectPathAfter = "/") {
  // Reserved for Phase 2 (post-MVP): OAuth runtime remains available but disabled in MVP UI.
  const supabase = getSupabaseClient();
  const providerMap = {
    google: "google",
    linkedin: "linkedin_oidc",
  };
  const supabaseProvider = providerMap[provider] || provider;
  const redirectTo = redirectPath(redirectPathAfter);

  const options =
    supabaseProvider === "google"
      ? getGoogleOAuthOptions(redirectTo)
      : getLinkedInOAuthOptions(redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: supabaseProvider,
    options,
  });

  if (error) {
    throw new Error(formatOAuthError(error, supabaseProvider));
  }

  if (typeof window !== "undefined" && data?.url) {
    window.location.assign(data.url);
  }
}

export async function supabaseAdminLogin(email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const role = (data.user?.app_metadata?.role || "").toLowerCase();
  if (!ADMIN_ROLES.has(role)) {
    await supabase.auth.signOut();
    return { data: { success: false } };
  }

  return { data: { success: true } };
}

export function supabaseIsAdminSession() {
  return false;
}

export async function supabaseIsAdmin() {
  try {
    const user = await supabaseGetCurrentUser();
    return isAdminRole(user);
  } catch {
    return false;
  }
}

export async function supabaseCheckAppReady() {
  return { id: "supabase", public_settings: {} };
}
