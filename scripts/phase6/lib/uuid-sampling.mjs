/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01). Do not execute.
 * See docs/phase6-master-execution-plan.md
 */
import { randomInt } from "node:crypto";
import {
  PAGE_SIZE,
  UUID_SAMPLE_FIRST,
  UUID_SAMPLE_LAST,
  UUID_SAMPLE_MAX,
  UUID_SAMPLE_RANDOM,
  UUID_SAMPLE_SORT_ASC,
  UUID_SAMPLE_SORT_DESC,
} from "./entity-registry.mjs";
import { fetchEntityPage } from "./paginated-export.mjs";

const REQUEST_DELAY_MS = Number(process.env.PHASE6_REQUEST_DELAY_MS || 200);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  if (REQUEST_DELAY_MS > 0) {
    await sleep(REQUEST_DELAY_MS);
  }
}

/**
 * Deduplicate rows by `id`, preserving first occurrence order.
 * @param {Array<Record<string, unknown>>} rows
 */
export function dedupeById(rows) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const id = row?.id;
    if (id === null || id === undefined || id === "") {
      out.push(row);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }

  return out;
}

/**
 * Count entity rows via paginated `page` calls (ASC). Does not persist data.
 * @param {import('@base44/sdk').Base44Client} base44
 * @param {string} entityName
 */
export async function estimateEntityRowCount(base44, entityName) {
  let skip = 0;
  let total = 0;

  while (true) {
    const { rows, count } = await fetchEntityPage(
      base44,
      entityName,
      skip,
      PAGE_SIZE,
      UUID_SAMPLE_SORT_ASC
    );

    if (!rows.length) {
      break;
    }

    total += rows.length;

    if (count < PAGE_SIZE) {
      break;
    }

    skip += rows.length;
    await throttle();
  }

  return total;
}

/**
 * Pick `count` unique random indices in [0, totalRows).
 * @param {number} totalRows
 * @param {number} count
 */
export function pickRandomIndices(totalRows, count) {
  if (totalRows <= 0 || count <= 0) {
    return [];
  }

  const target = Math.min(count, totalRows);
  const indices = new Set();

  while (indices.size < target) {
    indices.add(randomInt(0, totalRows));
  }

  return [...indices].sort((a, b) => a - b);
}

/**
 * Fetch one row per index using ASC sort + skip (limit 1 per index).
 * @param {import('@base44/sdk').Base44Client} base44
 * @param {string} entityName
 * @param {number[]} indices
 */
export async function fetchRowsAtIndices(base44, entityName, indices) {
  const rows = [];

  for (const index of indices) {
    const { rows: batch } = await fetchEntityPage(
      base44,
      entityName,
      index,
      1,
      UUID_SAMPLE_SORT_ASC
    );

    if (batch[0]) {
      rows.push(batch[0]);
    }

    await throttle();
  }

  return rows;
}

/**
 * Stratified UUID verification sample per Phase 6C.3B:
 * - first 5 (created_date ASC)
 * - last 5 (created_date DESC)
 * - 10 random (uniform index into ASC-ordered population)
 * - dedupe by id, cap at 20
 *
 * @param {import('@base44/sdk').Base44Client} base44
 * @param {string} entityName
 */
export async function fetchUuidVerificationSample(base44, entityName) {
  const firstResult = await fetchEntityPage(
    base44,
    entityName,
    0,
    UUID_SAMPLE_FIRST,
    UUID_SAMPLE_SORT_ASC
  );
  await throttle();

  const lastResult = await fetchEntityPage(
    base44,
    entityName,
    0,
    UUID_SAMPLE_LAST,
    UUID_SAMPLE_SORT_DESC
  );
  await throttle();

  const firstRows = firstResult.rows;
  const lastRows = lastResult.rows;
  const totalRows = await estimateEntityRowCount(base44, entityName);

  const randomIndices = pickRandomIndices(totalRows, UUID_SAMPLE_RANDOM);
  const randomRows = await fetchRowsAtIndices(base44, entityName, randomIndices);

  const merged = dedupeById([...firstRows, ...lastRows, ...randomRows]);
  const rows = merged.slice(0, UUID_SAMPLE_MAX);

  return {
    rows,
    meta: {
      firstFetched: firstRows.length,
      lastFetched: lastRows.length,
      randomIndicesRequested: UUID_SAMPLE_RANDOM,
      randomIndicesSelected: randomIndices.length,
      randomFetched: randomRows.length,
      totalRows,
      beforeDedupe: firstRows.length + lastRows.length + randomRows.length,
      afterDedupe: merged.length,
      finalSample: rows.length,
    },
  };
}
