import { writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01)
 * Do not execute. Gate 4 manifest generation not required.
 * See docs/phase6-master-execution-plan.md
 *
 * Build or update manifest.json from export directory.
 * @param {string} exportDir
 * @param {Array<{ entity: string, exportedRows: number, exportTimestamp: string }>} [entries]
 * @param {string} [exportTimestamp]
 */
export async function writeManifest(exportDir, entries, exportTimestamp) {
  const ts = exportTimestamp || new Date().toISOString();
  const manifest = {
    exportTimestamp: ts,
    entities: entries.map((e) => ({
      entity: e.entity,
      exportedRows: e.exportedRows,
      exportTimestamp: e.exportTimestamp || ts,
    })),
  };

  const manifestPath = path.join(exportDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

/**
 * Regenerate manifest by counting rows in existing *.json export files.
 * Skips manifest.json, samples/, and analysis files.
 */
export async function generateManifestFromDisk(exportDir) {
  const files = await readdir(exportDir);
  const entityFiles = files.filter(
    (f) => f.endsWith(".json") && f !== "manifest.json" && f !== "uuid-sample-analysis.json"
  );

  const exportTimestamp = new Date().toISOString();
  const entries = [];

  for (const file of entityFiles.sort()) {
    const raw = await readFile(path.join(exportDir, file), "utf8");
    const data = JSON.parse(raw);
    const entity = file.replace(/\.json$/, "");
    entries.push({
      entity,
      exportedRows: Array.isArray(data) ? data.length : 0,
      exportTimestamp,
    });
  }

  return writeManifest(exportDir, entries, exportTimestamp);
}

// CLI: node scripts/phase6/generate-manifest.mjs [exportDir]
const isCli =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isCli) {
  const exportDir = process.argv[2] || path.resolve("exports/phase6");
  generateManifestFromDisk(exportDir)
    .then((p) => console.log(`Manifest written: ${p}`))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
