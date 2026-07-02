/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01). Do not execute.
 * See docs/phase6-master-execution-plan.md
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Serialize records preserving null values, nested objects, and arrays.
 * Undefined values are omitted (not present in JSON from API).
 * @param {unknown} data
 */
export function serializeExportJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

/**
 * @param {string} filePath
 * @param {unknown} data
 */
export async function writeExportJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, serializeExportJson(data), "utf8");
}
