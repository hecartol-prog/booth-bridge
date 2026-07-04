/**
 * Bundle Edge Function files for MCP deploy (Phase 7.4F).
 * Usage: node scripts/phase7-4f/bundle-edge-function.mjs <function-name>
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../../supabase/functions");
const name = process.argv[2];

if (!name) {
  console.error("Usage: node bundle-edge-function.mjs <function-name>");
  process.exit(1);
}

const sharedDir = join(root, "_shared");
const fnDir = join(root, name);
const indexPath = join(fnDir, "index.ts");

if (!existsSync(indexPath)) {
  console.error(`Missing ${indexPath}`);
  process.exit(1);
}

const files = [{ name: "index.ts", content: readFileSync(indexPath, "utf8") }];

if (existsSync(sharedDir)) {
  for (const file of readdirSync(sharedDir)) {
    if (!file.endsWith(".ts")) continue;
    files.push({
      name: `../_shared/${file}`,
      content: readFileSync(join(sharedDir, file), "utf8"),
    });
  }
}

console.log(JSON.stringify(files));
