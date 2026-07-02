#!/usr/bin/env node
/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01)
 * Do not execute. Gate 2 UUID verification not required.
 * See docs/phase6-master-execution-plan.md
 *
 * Phase 6C.3B — UUID verification (stratified sample per entity).
 *
 * Per entity (max 20 rows after dedupe):
 *   - first 5 records  (created_date ASC)
 *   - last 5 records   (created_date DESC)
 *   - 10 random records (uniform index into ASC-ordered population)
 *
 * No full export. No JSON files. No Supabase. Console output only.
 *
 *   node scripts/phase6/verify-uuid-sample.mjs
 */
import { ALL_ENTITY_NAMES, UUID_SAMPLE_MAX } from "./lib/entity-registry.mjs";
import {
  createExportClient,
  ensureAuthenticated,
  getExportSecret,
} from "./lib/base44-client.mjs";
import { fetchUuidVerificationSample } from "./lib/uuid-sampling.mjs";
import {
  analyzeEntityIds,
  buildCompatibilitySummary,
} from "./lib/uuid-analysis.mjs";

async function main() {
  getExportSecret();

  const base44 = await createExportClient();
  await ensureAuthenticated(base44);

  console.log(
    `Gate 2 UUID verification — up to ${UUID_SAMPLE_MAX} rows/entity (5 first + 5 last + 10 random, deduped), ${ALL_ENTITY_NAMES.length} entities`
  );
  console.log("Output: console only (no files written)\n");

  const perEntity = [];

  for (const entity of ALL_ENTITY_NAMES) {
    process.stdout.write(`Sampling ${entity}... `);

    const { rows, meta } = await fetchUuidVerificationSample(base44, entity);
    const analysis = analyzeEntityIds(entity, rows);

    perEntity.push({
      ...analysis,
      sampling: meta,
    });

    console.log(
      `${analysis.totalSampled} rows (first=${meta.firstFetched} last=${meta.lastFetched} random=${meta.randomFetched} deduped from ${meta.beforeDedupe}) | UUID: ${analysis.uuidCount} | non-UUID: ${analysis.nonUuidCount} | ${analysis.uuidPercentage}% | ${analysis.classification}`
    );
  }

  const summary = buildCompatibilitySummary(perEntity);

  const recommendation =
    summary.allUuidCompatible && summary.entitiesWithData > 0
      ? "Preserve Base44 IDs"
      : summary.anyMixed || summary.anyRemap
        ? "Generate remapping"
        : summary.recommendation;

  console.log("\n--- Summary ---");
  console.log(`Entities analyzed: ${summary.entitiesAnalyzed}`);
  console.log(`Entities with data: ${summary.entitiesWithData}`);
  console.log(`Entities empty: ${summary.entitiesEmpty}`);
  console.log(`Recommendation: ${recommendation}`);
}

main().catch((err) => {
  console.error("\nUUID verification failed:", err.message);
  process.exit(1);
});
