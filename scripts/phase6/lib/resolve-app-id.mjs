/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01). Do not execute.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * Resolve Base44 app ID from env or committed base44/.app.jsonc.
 */
export async function resolveAppId() {
  const fromEnv = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
  if (fromEnv) return fromEnv;

  try {
    const raw = await readFile(
      path.join(REPO_ROOT, "base44/.app.jsonc"),
      "utf8"
    );
    const stripped = raw.replace(/\/\/.*$/gm, "").replace(/,\s*}/g, "}");
    const parsed = JSON.parse(stripped);
    if (parsed?.id) return String(parsed.id);
  } catch {
    // fall through
  }

  return null;
}
