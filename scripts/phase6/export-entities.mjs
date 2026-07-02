#!/usr/bin/env node
/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01)
 * Do not execute. Base44 contains demo data only; no production import required.
 * Preserved for historical reference. See docs/phase6-master-execution-plan.md
 *
 * Phase 6 — Full entity export (all ENTITY_TABLE_MAP entities).
 *
 * DOES NOT run automatically. Invoke manually after approval.
 *
 *   node scripts/phase6/export-entities.mjs
 *
 * Prerequisites: phase6Export function deployed; env vars set (see README).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_ENTITY_NAMES } from "./lib/entity-registry.mjs";
import {
  createExportClient,
  ensureAuthenticated,
  getExportSecret,
} from "./lib/base44-client.mjs";
import { fetchAllEntityRows } from "./lib/paginated-export.mjs";
import { writeExportJson } from "./lib/json-writer.mjs";
import { writeManifest } from "./generate-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const EXPORT_DIR = path.resolve(REPO_ROOT, "exports/phase6");

async function main() {
  getExportSecret();

  const base44 = await createExportClient();
  await ensureAuthenticated(base44);

  console.log(`Export directory: ${EXPORT_DIR}`);
  console.log(`Entities: ${ALL_ENTITY_NAMES.length}`);
  console.log("Starting export — this may take several minutes.\n");

  const manifestEntries = [];
  const exportTimestamp = new Date().toISOString();

  for (const entity of ALL_ENTITY_NAMES) {
    const started = Date.now();
    process.stdout.write(`Exporting ${entity}... `);

    const rows = await fetchAllEntityRows(base44, entity, (name, total, page) => {
      process.stdout.write(`\rExporting ${name}... ${total} rows (page ${page})`);
    });

    const outPath = path.join(EXPORT_DIR, `${entity}.json`);
    await writeExportJson(outPath, rows);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\rExporting ${entity}... ${rows.length} rows → ${entity}.json (${elapsed}s)`);

    manifestEntries.push({
      entity,
      exportedRows: rows.length,
      exportTimestamp,
    });
  }

  await writeManifest(EXPORT_DIR, manifestEntries, exportTimestamp);

  console.log(`\nDone. Manifest: exports/phase6/manifest.json`);
}

main().catch((err) => {
  console.error("\nExport failed:", err.message);
  process.exit(1);
});
