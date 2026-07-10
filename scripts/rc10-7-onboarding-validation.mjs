#!/usr/bin/env node
/**
 * RC10.7 — validates onboarding merge logic (no live Supabase required).
 */
import assert from "node:assert/strict";
import {
  buildAppUserModel,
  extractProfileMetadata,
  isOnboardingComplete,
} from "../src/api/appUserModel.js";

function run() {
  const authUser = {
    id: "user-1",
    email: "test@example.com",
    app_metadata: { role: "user" },
    user_metadata: {
      first_name: "Ada",
      user_role: "buyer",
      onboarded: false,
      profile_id: "stale-profile",
    },
  };

  const appRow = {
    user_role: "buyer",
    onboarded: true,
    profile_id: "profile-42",
  };

  const merged = buildAppUserModel(authUser, appRow);
  assert.equal(merged.user_role, "buyer", "user_role must come from public.user");
  assert.equal(merged.onboarded, true, "onboarded must come from public.user");
  assert.equal(merged.profile_id, "profile-42", "profile_id must come from public.user");
  assert.equal(merged.first_name, "Ada", "profile metadata must be preserved");
  assert.equal(merged.role, "user", "platform role from app_metadata");

  const staleMetaOnly = buildAppUserModel(authUser, {
    user_role: null,
    onboarded: false,
    profile_id: null,
  });
  assert.equal(staleMetaOnly.onboarded, false, "missing app row defaults onboarded to false");
  assert.equal(staleMetaOnly.user_role, null, "must not fall back to JWT user_role");

  const profileMeta = extractProfileMetadata(authUser.user_metadata);
  assert.equal(profileMeta.user_role, undefined);
  assert.equal(profileMeta.onboarded, undefined);
  assert.equal(profileMeta.first_name, "Ada");

  assert.equal(isOnboardingComplete({ onboarded: true, user_role: "buyer" }), true);
  assert.equal(isOnboardingComplete({ onboarded: true, user_role: null }), false);
  assert.equal(isOnboardingComplete({ onboarded: false, user_role: "buyer" }), false);

  console.log("RC10.7 onboarding validation: all checks passed");
}

run();
