#!/usr/bin/env node
/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01)
 * Do not execute. Gate 4 manifest generation not required.
 * See docs/phase6-master-execution-plan.md
 *
 * Phase 6 — Dry-run estimator (no API calls, no Supabase).
 *
 *   node scripts/phase6/dry-run-estimate.mjs
 */
import { ALL_ENTITY_NAMES, PAGE_SIZE } from "./lib/entity-registry.mjs";

/** Heuristic average JSON bytes per row by domain (pre-export estimate). */
const ROW_SIZE_ESTIMATE = {
  Activity: 1200,
  Connection: 800,
  Notification: 400,
  LeadProfile: 900,
  Product: 700,
  ExhibitorProfile: 1100,
  ScannedContact: 1500,
  default: 600,
};

/** Heuristic row counts when production manifest unavailable. */
const ROW_COUNT_ESTIMATE = {
  User: 500,
  Event: 20,
  ExhibitorProfile: 800,
  BuyerProfile: 600,
  Connection: 5000,
  Activity: 15000,
  Notification: 8000,
  Product: 3000,
  Meeting: 1500,
  RFI: 2000,
  LeadProfile: 500,
  default: 100,
};

function estimateRows(entity) {
  return ROW_COUNT_ESTIMATE[entity] ?? ROW_COUNT_ESTIMATE.default;
}

function estimateBytesPerRow(entity) {
  return ROW_SIZE_ESTIMATE[entity] ?? ROW_SIZE_ESTIMATE.default;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function main() {
  const totalEntities = ALL_ENTITY_NAMES.length;
  let totalRows = 0;
  let totalBytes = 0;
  let totalPages = 0;

  const perEntity = ALL_ENTITY_NAMES.map((entity) => {
    const rows = estimateRows(entity);
    const bytes = rows * estimateBytesPerRow(entity);
    const pages = Math.ceil(rows / PAGE_SIZE) || (rows > 0 ? 1 : 0);
    totalRows += rows;
    totalBytes += bytes;
    totalPages += pages;
    return { entity, rows, bytes, pages };
  });

  const delayMs = Number(process.env.PHASE6_REQUEST_DELAY_MS || 200);
  const secondsPerRequest = 0.5 + delayMs / 1000;
  const estimatedSeconds = totalPages * secondsPerRequest;
  const estimatedMinutes = estimatedSeconds / 60;

  console.log("Phase 6 Export — Dry Run Estimate");
  console.log("==================================\n");
  console.log(`Total entities:        ${totalEntities}`);
  console.log(`Estimated total rows:  ~${totalRows.toLocaleString()} (heuristic — not measured)`);
  console.log(`Estimated export size: ~${formatBytes(totalBytes)} uncompressed JSON`);
  console.log(`Estimated API pages:   ${totalPages} (@ ${PAGE_SIZE} rows/page)`);
  console.log(
    `Estimated duration:    ~${estimatedMinutes.toFixed(1)} min (${totalPages} requests × ~${secondsPerRequest.toFixed(1)}s)`
  );
  console.log("\nPossible rate limits:");
  console.log("  - Base44 list()/filter() max 5,000 rows per request (handled by pagination)");
  console.log("  - Function invoke throughput (platform-dependent; use PHASE6_REQUEST_DELAY_MS=200+)");
  console.log("  - No documented per-minute cap; throttle if 429 responses occur");
  console.log("\nPer-entity estimates:\n");
  console.log("Entity                      Rows~    Pages  Size~");
  console.log("------------------------- -------- ------ --------");

  for (const row of perEntity) {
    console.log(
      `${row.entity.padEnd(25)} ${String(row.rows).padStart(8)} ${String(row.pages).padStart(6)} ${formatBytes(row.bytes).padStart(8)}`
    );
  }

  console.log("\nNOTE: Run verify-uuid-sample.mjs first, then export-entities.mjs after approval.");
}

main();
