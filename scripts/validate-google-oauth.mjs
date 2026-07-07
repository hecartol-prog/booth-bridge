/**
 * Validate Google OAuth initiation against Supabase (no browser required).
 *
 * Usage (loads .env.local automatically when present):
 *   node scripts/validate-google-oauth.mjs
 *
 * Or pass env vars explicitly:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/validate-google-oauth.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const APP_URL = process.env.VITE_APP_URL || "https://www.boothbridge.app";
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

if (!SUPABASE_URL || !ANON_KEY) {
  fail("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

const callbackUrl = `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/callback`;
const redirectTo = `${APP_URL.replace(/\/$/, "")}/`;

console.log("Google OAuth configuration check");
console.log("─".repeat(48));
console.log(`Supabase project:     ${SUPABASE_URL}`);
console.log(`App redirect (redirectTo): ${redirectTo}`);
console.log(`Google redirect URI:  ${callbackUrl}`);
if (GOOGLE_CLIENT_ID) {
  console.log(`Web client ID (env):  ${GOOGLE_CLIENT_ID}`);
  console.log("  → Must be first in Supabase Dashboard → Auth → Google → Client IDs");
}
console.log("─".repeat(48));

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { flowType: "pkce", detectSessionInUrl: false },
});

const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo,
    skipBrowserRedirect: true,
    queryParams: { access_type: "online", prompt: "select_account" },
    scopes: "openid email profile",
  },
});

if (error) {
  fail(error.message);
}

if (!data?.url) {
  fail("signInWithOAuth returned no URL — is Google provider enabled in Supabase?");
}

const authorizeUrl = new URL(data.url);
if (!authorizeUrl.hostname.includes("supabase")) {
  fail(`Unexpected authorize host: ${authorizeUrl.hostname}`);
}

ok(`OAuth authorize URL generated (${authorizeUrl.origin}${authorizeUrl.pathname})`);
ok("Google provider appears enabled on Supabase");
console.log("\nNext steps in Google Cloud Console (Web application client):");
console.log(`  Authorized redirect URI: ${callbackUrl}`);
console.log(`  Authorized JavaScript origins: ${APP_URL.replace(/\/$/, "")}`);
console.log("\nIn Supabase Dashboard → Auth → URL Configuration:");
console.log(`  Site URL: ${APP_URL.replace(/\/$/, "")}`);
console.log(`  Redirect URLs: ${APP_URL.replace(/\/$/, "")}/**`);
