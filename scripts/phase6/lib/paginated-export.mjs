/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01). Do not execute.
 * See docs/phase6-master-execution-plan.md
 */
import { DEFAULT_SORT, PAGE_SIZE } from "./entity-registry.mjs";

const PHASE6_EXPORT_FUNCTION = "phase6Export";
const DEFAULT_DELAY_MS = Number(process.env.PHASE6_REQUEST_DELAY_MS || 200);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch one page via the phase6Export service-role backend function.
 * @param {import('@base44/sdk').Base44Client} base44
 * @param {string} entityName
 * @param {number} skip
 * @param {number} limit
 */
export async function fetchEntityPage(
  base44,
  entityName,
  skip,
  limit,
  sort = DEFAULT_SORT
) {
  const payload = {
    action: "page",
    entity: entityName,
    skip,
    limit,
    sort,
    secret: process.env.PHASE6_EXPORT_SECRET,
  };

  const result = await base44.functions.invoke(PHASE6_EXPORT_FUNCTION, payload);

  if (result?.error) {
    throw new Error(`phase6Export page failed for ${entityName}: ${result.error}`);
  }

  return {
    rows: result.rows ?? [],
    count: result.count ?? (result.rows?.length ?? 0),
    skip: result.skip ?? skip,
    limit: result.limit ?? limit,
  };
}

/**
 * Fetch sample rows via phase6Export.
 * @param {import('@base44/sdk').Base44Client} base44
 * @param {string} entityName
 * @param {number} sampleSize
 */
export async function fetchEntitySample(base44, entityName, sampleSize) {
  const payload = {
    action: "sample",
    entity: entityName,
    sampleSize,
    sort: DEFAULT_SORT,
    secret: process.env.PHASE6_EXPORT_SECRET,
  };

  const result = await base44.functions.invoke(PHASE6_EXPORT_FUNCTION, payload);

  if (result?.error) {
    throw new Error(`phase6Export sample failed for ${entityName}: ${result.error}`);
  }

  return result.rows ?? [];
}

/**
 * Paginate until exhausted (page size 5000).
 * @param {import('@base44/sdk').Base44Client} base44
 * @param {string} entityName
 * @param {(entity: string, fetched: number, pageCount: number) => void} [onProgress]
 */
export async function fetchAllEntityRows(base44, entityName, onProgress) {
  const allRows = [];
  let skip = 0;
  let pageIndex = 0;

  while (true) {
    const { rows, count } = await fetchEntityPage(
      base44,
      entityName,
      skip,
      PAGE_SIZE
    );

    if (!rows.length) {
      break;
    }

    allRows.push(...rows);
    pageIndex += 1;

    if (onProgress) {
      onProgress(entityName, allRows.length, pageIndex);
    }

    if (count < PAGE_SIZE) {
      break;
    }

    skip += rows.length;

    if (DEFAULT_DELAY_MS > 0) {
      await sleep(DEFAULT_DELAY_MS);
    }
  }

  return allRows;
}
