/**
 * Supabase authentication implementation (Phase 7.4B).
 * Internal module — consumed by authClient.js only.
 */

import { getSupabaseClient } from "@/api/supabaseClient";
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

/** Map Supabase auth user + public.user row → Base44-compatible app user */
export async function mergeAppUser(authUser) {
  if (!authUser) return null;

  const supabase = getSupabaseClient();
  const { data: appRow } = await supabase
    .from("user")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  const meta = authUser.user_metadata || {};
  const appMeta = authUser.app_metadata || {};
  const roleFromClaims = (appMeta.role || "").toString().toLowerCase();

  return {
    id: authUser.id,
    email: authUser.email,
    role: roleFromClaims || "user",
    user_role: appRow?.user_role || meta.user_role || null,
    onboarded: appRow?.onboarded ?? meta.onboarded ?? false,
    profile_id: appRow?.profile_id ?? meta.profile_id ?? null,
    ...meta,
  };
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

  await supabase.from("user").upsert({ id: userId, ...patch }, { onConflict: "id" });
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
  return mergeAppUser(data.user);
}

export async function supabaseRegister({
  email,
  password,
  first_name,
  last_name,
}) {
  const supabase = getSupabaseClient();
  const displayName = [first_name, last_name].filter(Boolean).join(" ").trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectPath("/"),
      data: {
        // Keep auth metadata minimal for MVP.
        // Business profile fields are Phase 2 migration work.
        display_name: displayName || "",
        role: "user",
        onboarding_complete: false,
      },
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

export async function supabaseUpdateUserMetadata(fields) {
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Not authenticated");

  const metaPatch = {};
  if (fields.user_role !== undefined) metaPatch.user_role = fields.user_role;
  if (fields.onboarded !== undefined) metaPatch.onboarded = fields.onboarded;
  if (fields.profile_id !== undefined) metaPatch.profile_id = fields.profile_id;

  let updatedUser = userData.user;
  if (Object.keys(metaPatch).length > 0) {
    const { data, error } = await supabase.auth.updateUser({ data: metaPatch });
    if (error) throw error;
    updatedUser = data.user;
  }

  await syncAppUserRow(userData.user.id, fields);
  return mergeAppUser(updatedUser);
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
  // Reserved for Phase 2 (OAuth providers reactivation).
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
