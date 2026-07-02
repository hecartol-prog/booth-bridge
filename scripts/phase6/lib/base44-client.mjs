/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01). Do not execute.
 * See docs/phase6-master-execution-plan.md
 */
import { createClient } from "@base44/sdk";
import { resolveAppId } from "./resolve-app-id.mjs";

/**
 * Create a Base44 SDK client for Phase 6 export orchestration (Node.js).
 *
 * Service-role data access is NOT available on external createClient() instances.
 * Full export must call the deployed `phase6Export` backend function, which uses
 * `base44.asServiceRole.entities` inside Base44-hosted Deno.
 *
 * @see base44/functions/phase6Export/entry.ts
 * @see https://docs.base44.com/developers/references/sdk/getting-started/client
 */
export async function createExportClient() {
  const appId = await resolveAppId();
  const appBaseUrl =
    process.env.BASE44_APP_BASE_URL || process.env.VITE_BASE44_APP_BASE_URL;
  const functionsVersion =
    process.env.BASE44_FUNCTIONS_VERSION ||
    process.env.VITE_BASE44_FUNCTIONS_VERSION;
  const token = process.env.BASE44_ACCESS_TOKEN || process.env.BASE44_TOKEN;

  if (!appId) {
    throw new Error(
      "Missing BASE44_APP_ID (or VITE_BASE44_APP_ID). Set in environment or .env.local."
    );
  }

  /** @type {import('@base44/sdk').CreateClientConfig} */
  const config = { appId };

  if (appBaseUrl) config.appBaseUrl = appBaseUrl;
  if (functionsVersion) config.functionsVersion = functionsVersion;
  if (token) config.token = token;

  return createClient(config);
}

/**
 * Authenticate if email/password provided (needed to invoke backend functions).
 */
export async function ensureAuthenticated(base44) {
  if (process.env.BASE44_ACCESS_TOKEN || process.env.BASE44_TOKEN) {
    return base44;
  }

  const email = process.env.BASE44_EXPORT_EMAIL;
  const password = process.env.BASE44_EXPORT_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set BASE44_ACCESS_TOKEN or BASE44_EXPORT_EMAIL + BASE44_EXPORT_PASSWORD to invoke phase6Export."
    );
  }

  await base44.auth.loginViaEmailPassword(email, password);
  return base44;
}

export function getExportSecret() {
  const secret = process.env.PHASE6_EXPORT_SECRET;
  if (!secret) {
    throw new Error(
      "Missing PHASE6_EXPORT_SECRET — must match the secret configured on the phase6Export Base44 function."
    );
  }
  return secret;
}

export const PHASE6_EXPORT_FUNCTION = "phase6Export";
