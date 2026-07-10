/**
 * App user model merge — RC10.7 single source of truth for onboarding state.
 *
 * Field sources:
 * - auth.users.id, email — Supabase Auth identity
 * - auth.users.app_metadata.role — platform admin role (RLS-safe; server-set only)
 * - auth.users.user_metadata — registration profile hints (first_name, company, etc.)
 *   NOT used for onboarded / user_role / profile_id (those live in public.user)
 * - public.user.user_role — app role: "buyer" | "exhibitor"
 * - public.user.onboarded — onboarding completion flag
 * - public.user.profile_id — FK to buyer_profile or exhibitor_profile (polymorphic)
 * - buyer_profile / exhibitor_profile — loaded separately by pages via profile_id
 */

const ONBOARDING_META_KEYS = new Set(["user_role", "onboarded", "profile_id", "role"]);

/** @param {Record<string, unknown> | null | undefined} meta */
export function extractProfileMetadata(meta) {
  if (!meta || typeof meta !== "object") return {};
  const profile = { ...meta };
  for (const key of ONBOARDING_META_KEYS) {
    delete profile[key];
  }
  return profile;
}

/**
 * @param {import("@supabase/supabase-js").User | null | undefined} authUser
 * @param {{ user_role?: string | null, onboarded?: boolean | null, profile_id?: string | null } | null | undefined} appRow
 */
export function buildAppUserModel(authUser, appRow) {
  if (!authUser) return null;

  const meta = authUser.user_metadata || {};
  const appMeta = authUser.app_metadata || {};
  const roleFromClaims = (appMeta.role || "").toString().toLowerCase();
  const profileMeta = extractProfileMetadata(meta);

  return {
    ...profileMeta,
    id: authUser.id,
    email: authUser.email,
    role: roleFromClaims || "user",
    user_role: appRow?.user_role ?? null,
    onboarded: appRow?.onboarded ?? false,
    profile_id: appRow?.profile_id ?? null,
  };
}

/** @param {{ onboarded?: boolean | null, user_role?: string | null, profile_id?: string | null } | null | undefined} row */
export function isOnboardingComplete(row) {
  return Boolean(row?.onboarded && row?.user_role);
}
