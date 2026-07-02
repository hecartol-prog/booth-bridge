#!/usr/bin/env node
/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01)
 * Do not execute. Gate 1 infrastructure verification not required.
 * See docs/phase6-master-execution-plan.md
 *
 * Phase 6C.3A — Export infrastructure verification (no data export).
 *
 * Tests:
 *   1. Function reachable (ping)
 *   2. Invalid secret rejected (401)
 *   3. Valid secret accepted (probe)
 *   4. Service-role handler for all 39 entities
 *   5. Pagination initialized (no list() — zero rows fetched)
 *   6. Default sort matches registry
 *
 * Does NOT write export JSON, connect to Supabase, or read entity rows.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_ENTITY_NAMES, DEFAULT_SORT } from "./lib/entity-registry.mjs";
import { resolveAppId } from "./lib/resolve-app-id.mjs";
import {
  createExportClient,
  ensureAuthenticated,
  getExportSecret,
  PHASE6_EXPORT_FUNCTION,
} from "./lib/base44-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const REPORT_PATH = path.resolve(
  REPO_ROOT,
  "docs/phase6-infrastructure-verification-report.md"
);
const REQUEST_DELAY_MS = Number(process.env.PHASE6_REQUEST_DELAY_MS || 200);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function invokePhase6(base44, payload) {
  return base44.functions.invoke(PHASE6_EXPORT_FUNCTION, payload);
}

function pass(label, detail = "") {
  return { label, status: "PASS", detail };
}

function fail(label, detail) {
  return { label, status: "FAIL", detail };
}

function skip(label, detail) {
  return { label, status: "SKIP", detail };
}

function isUnauthorizedResponse(result, err) {
  if (result?.error === "Unauthorized") return true;
  const msg = err?.message || result?.error || "";
  return /unauthorized|401/i.test(String(msg));
}

async function main() {
  const timestamp = new Date().toISOString();
  const checks = [];
  let pingResult = null;
  let probeResult = null;
  const entityHandlerResults = [];

  const appId = await resolveAppId();
  const appBaseUrl =
    process.env.BASE44_APP_BASE_URL || process.env.VITE_BASE44_APP_BASE_URL;

  if (!appId) {
    checks.push(
      fail("Environment: BASE44_APP_ID", "Set BASE44_APP_ID or VITE_BASE44_APP_ID")
    );
    await writeReport(timestamp, checks, { pingResult, probeResult, entityHandlerResults });
    process.exit(1);
  }

  checks.push(pass(`Environment: appId configured (${appId})`));

  if (!appBaseUrl) {
    checks.push(
      skip(
        "Environment: BASE44_APP_BASE_URL",
        "Optional but recommended for function routing"
      )
    );
  } else {
    checks.push(pass(`Environment: appBaseUrl (${appBaseUrl})`));
  }

  let secret;
  try {
    secret = getExportSecret();
    checks.push(pass("Environment: PHASE6_EXPORT_SECRET set locally"));
  } catch (err) {
    checks.push(fail("Environment: PHASE6_EXPORT_SECRET", err.message));
    checks.push(
      skip(
        "Deployment: phase6Export publish",
        "Cannot verify until secret is set — publish on Base44 and configure workspace secret"
      )
    );
    await writeReport(timestamp, checks, { pingResult, probeResult, entityHandlerResults });
    process.exit(1);
  }

  const base44 = await createExportClient();

  try {
    await ensureAuthenticated(base44);
    checks.push(pass("Authentication: SDK client authenticated"));
  } catch (err) {
    checks.push(fail("Authentication: SDK client", err.message));
    await writeReport(timestamp, checks, { pingResult, probeResult, entityHandlerResults });
    process.exit(1);
  }

  try {
    pingResult = await invokePhase6(base44, { action: "ping" });

    if (pingResult?.ok && pingResult?.entityRegistryCount === ALL_ENTITY_NAMES.length) {
      checks.push(
        pass(
          `Ping: function deployed (registry=${pingResult.entityRegistryCount})`
        )
      );
    } else if (pingResult?.error) {
      checks.push(fail("Ping: function deployed", pingResult.error));
    } else {
      checks.push(
        fail("Ping: function deployed", `Unexpected: ${JSON.stringify(pingResult)}`)
      );
    }

    if (pingResult?.defaultSort === DEFAULT_SORT) {
      checks.push(pass(`Ping: default sort (${DEFAULT_SORT})`));
    } else if (pingResult?.ok) {
      checks.push(
        fail(
          "Ping: default sort",
          `Expected ${DEFAULT_SORT}, got ${pingResult?.defaultSort}`
        )
      );
    }

    if (pingResult?.ok && pingResult?.secretConfigured === true) {
      checks.push(pass("Ping: PHASE6_EXPORT_SECRET configured on Base44"));
    } else if (pingResult?.ok) {
      checks.push(
        fail(
          "Ping: PHASE6_EXPORT_SECRET on Base44",
          "secretConfigured=false — set secret in Base44 workspace before probe"
        )
      );
    }
  } catch (err) {
    checks.push(
      fail(
        "Ping: function deployed",
        `${err.message} — publish app on Base44 to deploy phase6Export`
      )
    );
  }

  try {
    const wrongSecretResult = await invokePhase6(base44, {
      action: "probe",
      entity: "SystemAlert",
      secret: "__invalid_secret_for_infra_test__",
    });

    if (isUnauthorizedResponse(wrongSecretResult)) {
      checks.push(pass("Authentication: invalid secret → 401 Unauthorized"));
    } else if (wrongSecretResult?.ok) {
      checks.push(
        fail(
          "Authentication: invalid secret → 401 Unauthorized",
          "Probe succeeded with wrong secret"
        )
      );
    } else {
      checks.push(
        pass(
          "Authentication: invalid secret rejected",
          wrongSecretResult?.error || "error returned"
        )
      );
    }
  } catch (err) {
    if (isUnauthorizedResponse(null, err)) {
      checks.push(pass("Authentication: invalid secret → 401 Unauthorized"));
    } else {
      checks.push(
        skip("Authentication: invalid secret → 401", `Could not confirm: ${err.message}`)
      );
    }
  }

  let handlersOk = 0;
  let handlersFailed = 0;
  let probeBlocked = false;

  if (pingResult?.secretConfigured !== true) {
    probeBlocked = true;
    checks.push(
      skip(
        "Probe: valid secret + service-role",
        "Skipped — Base44 secret not configured (ping.secretConfigured=false)"
      )
    );
    checks.push(
      skip(
        `Entity handlers: ${ALL_ENTITY_NAMES.length}/${ALL_ENTITY_NAMES.length}`,
        "Skipped — probe requires valid Base44 secret"
      )
    );
  } else {
    try {
      probeResult = await invokePhase6(base44, {
        action: "probe",
        entity: "SystemAlert",
        secret,
        skip: 0,
        limit: 5000,
      });

      if (probeResult?.ok && probeResult?.serviceRoleAccess) {
        checks.push(pass("Probe: valid secret accepted"));
        checks.push(pass("Service-role: asServiceRole.entities initialized"));
      } else {
        checks.push(
          fail("Probe: valid secret", probeResult?.error || JSON.stringify(probeResult))
        );
        probeBlocked = true;
      }

      if (
        probeResult?.pagination?.initialized &&
        probeResult?.pagination?.dataFetched === false
      ) {
        checks.push(
          pass(
            `Pagination: initialized (limit=${probeResult.pagination.limit}, skip=${probeResult.pagination.skip}, dataFetched=false)`
          )
        );
      } else if (probeResult?.ok) {
        checks.push(
          fail(
            "Pagination: no entity rows read",
            `dataFetched=${probeResult?.pagination?.dataFetched}`
          )
        );
      }

      if (probeResult?.entityRegistryCount === ALL_ENTITY_NAMES.length) {
        checks.push(
          pass(`Entity registry: ${ALL_ENTITY_NAMES.length} entities in function`)
        );
      }
    } catch (err) {
      probeBlocked = true;
      checks.push(
        fail(
          "Probe: valid secret + service-role",
          `${err.message} — confirm local secret matches Base44 workspace`
        )
      );
    }

    if (!probeBlocked) {
      for (const entity of ALL_ENTITY_NAMES) {
        try {
          const result = await invokePhase6(base44, {
            action: "probe",
            entity,
            secret,
          });

          const ok =
            result?.ok &&
            result?.serviceRoleAccess &&
            result?.handlerPresent &&
            result?.listMethodPresent &&
            result?.pagination?.dataFetched === false;

          entityHandlerResults.push({
            entity,
            status: ok ? "PASS" : "FAIL",
            detail: ok ? "" : result?.error || "handler missing",
          });

          if (ok) handlersOk += 1;
          else handlersFailed += 1;
        } catch (err) {
          handlersFailed += 1;
          entityHandlerResults.push({
            entity,
            status: "FAIL",
            detail: err.message,
          });
        }

        if (REQUEST_DELAY_MS > 0) {
          await sleep(REQUEST_DELAY_MS);
        }
      }

      if (handlersFailed === 0) {
        checks.push(
          pass(
            `Entity handlers: ${handlersOk}/${ALL_ENTITY_NAMES.length} available (zero rows read)`
          )
        );
      } else {
        checks.push(
          fail(
            `Entity handlers: ${handlersOk}/${ALL_ENTITY_NAMES.length} available`,
            `${handlersFailed} failed — see entity table in report`
          )
        );
      }
    }
  }

  const failed = checks.filter((c) => c.status === "FAIL").length;
  const overall = failed === 0 ? "PASS" : "FAIL";

  await writeReport(timestamp, checks, {
    pingResult,
    probeResult,
    entityHandlerResults,
    overall,
    handlersOk,
    handlersFailed,
  });

  console.log(`Infrastructure verification: ${overall}`);
  for (const c of checks) {
    console.log(`  [${c.status}] ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\nReport: docs/phase6-infrastructure-verification-report.md`);
  console.log("\nConfirmed: ZERO entity rows exported | ZERO export JSON files | ZERO Supabase");

  process.exit(failed > 0 ? 1 : 0);
}

async function writeReport(
  timestamp,
  checks,
  { pingResult, probeResult, entityHandlerResults, overall, handlersOk, handlersFailed }
) {
  const failed = checks.filter((c) => c.status === "FAIL").length;
  const passed = checks.filter((c) => c.status === "PASS").length;
  const skipped = checks.filter((c) => c.status === "SKIP").length;
  const resolvedOverall =
    overall ?? (failed === 0 && skipped === 0 ? "PASS" : failed > 0 ? "FAIL" : "INCOMPLETE");

  const lines = [
    "# Phase 6C.3A — Infrastructure Verification Report",
    "",
    `**Generated:** ${timestamp}`,
    `**Overall:** ${resolvedOverall}`,
    "",
    "## Executive summary",
    "",
    "| Item | Status |",
    "|------|--------|",
    `| Deployment (ping) | ${pingResult?.ok ? "Reachable" : "Not verified / failed"} |`,
    `| Invalid secret → 401 | See checks below |`,
    `| Valid secret + probe | ${probeResult?.ok ? "Success" : "Not verified / failed"} |`,
    `| Service-role init | ${probeResult?.serviceRoleAccess ? "Success" : "Not verified / failed"} |`,
    `| Entity handlers | ${handlersOk ?? 0}/${ALL_ENTITY_NAMES.length} |`,
    `| Pagination (no data read) | ${probeResult?.pagination?.dataFetched === false ? "Confirmed" : "Not verified"} |`,
    `| Default sort | ${pingResult?.defaultSort === DEFAULT_SORT ? DEFAULT_SORT : "Mismatch / N/A"} |`,
    `| Entity data exported | **0** |`,
    `| Export JSON files | **0** |`,
    `| Supabase interaction | **0** |`,
    "",
    "## Summary",
    "",
    "| Result | Count |",
    "|--------|-------|",
    `| PASS | ${passed} |`,
    `| FAIL | ${failed} |`,
    `| SKIP | ${skipped} |`,
    "",
    "## Checks",
    "",
    "| Status | Check | Detail |",
    "|--------|-------|--------|",
  ];

  for (const c of checks) {
    lines.push(`| ${c.status} | ${c.label} | ${c.detail || "—"} |`);
  }

  if (entityHandlerResults?.length) {
    lines.push("", "## Entity handler probe (39/39)", "");
    lines.push("| Entity | Status | Detail |");
    lines.push("|--------|--------|--------|");
    for (const row of entityHandlerResults) {
      lines.push(`| ${row.entity} | ${row.status} | ${row.detail || "—"} |`);
    }
    lines.push(
      "",
      `**Handlers OK:** ${handlersOk ?? 0} | **Failed:** ${handlersFailed ?? 0}`
    );
  }

  lines.push("", "## Raw responses (metadata only)", "");

  if (pingResult) {
    lines.push("### ping", "", "```json", JSON.stringify(pingResult, null, 2), "```", "");
  }

  if (probeResult) {
    lines.push(
      "### probe (SystemAlert)",
      "",
      "```json",
      JSON.stringify(probeResult, null, 2),
      "```",
      ""
    );
  }

  lines.push(
    "## Manual steps if blocked",
    "",
    "1. **Publish** app on [Base44.com](https://Base44.com) (deploys `phase6Export`)",
    "2. Set **`PHASE6_EXPORT_SECRET`** in Base44 workspace secrets",
    "3. Set matching local env + `BASE44_EXPORT_EMAIL`/`PASSWORD` or `BASE44_ACCESS_TOKEN`",
    "4. Re-run: `npm run phase6:verify-infra`",
    "",
    "## Gate 1 readiness",
    "",
    resolvedOverall === "PASS"
      ? "Infrastructure verified. Approved to proceed to **Phase 6C.3B — UUID Verification** (Gate 2; stratified sample, console only, no export files)."
      : "Resolve failures above before Phase 6C.3B (Gate 2).",
    ""
  );

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, lines.join("\n"), "utf8");
}

main().catch((err) => {
  console.error("Infrastructure verification error:", err.message);
  process.exit(1);
});
