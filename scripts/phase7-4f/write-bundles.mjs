/**
 * Write Edge Function bundles for MCP deploy.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../../supabase/functions");
const outDir = join(__dirname, "bundles");

const FUNCTIONS = [
  "admin-auth",
  "ai-health",
  "ai-generate",
  "ai-chat",
  "ai-document",
  "ai-business-card",
  "ai-summary",
  "ai-classify",
  "ai-match",
  "ai-recommend",
];

const JWT = {
  "admin-auth": false,
  "ai-health": true,
  "ai-generate": true,
  "ai-chat": true,
  "ai-document": true,
  "ai-business-card": true,
  "ai-summary": true,
  "ai-classify": true,
  "ai-match": true,
  "ai-recommend": true,
};

function bundle(name) {
  const sharedDir = join(root, "_shared");
  const indexPath = join(root, name, "index.ts");
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
  return { name, verify_jwt: JWT[name], files };
}

mkdirSync(outDir, { recursive: true });
const manifest = FUNCTIONS.map((name) => {
  const b = bundle(name);
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(b), "utf8");
  return { name, verify_jwt: b.verify_jwt, fileCount: b.files.length };
});
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(JSON.stringify(manifest, null, 2));
