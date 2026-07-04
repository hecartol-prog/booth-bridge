/**
 * Deploy all BoothBridge Edge Functions (Phase 7.4F).
 * Requires: npx supabase + authenticated CLI (supabase login) or SUPABASE_ACCESS_TOKEN.
 */
import { spawnSync } from "node:child_process";

const PROJECT_REF = "ebaquannrgbgjihbjfdc";
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

const results = [];

for (const name of FUNCTIONS) {
  console.log(`\n=== Deploying ${name} ===`);
  const proc = spawnSync(
    "npx",
    ["supabase@latest", "functions", "deploy", name, "--project-ref", PROJECT_REF],
    { stdio: "pipe", shell: true, encoding: "utf8" },
  );
  const ok = proc.status === 0;
  results.push({ name, ok, stdout: proc.stdout?.slice(-500), stderr: proc.stderr?.slice(-500) });
  console.log(ok ? "OK" : "FAILED");
  if (!ok) console.error(proc.stderr || proc.stdout);
}

console.log("\n=== Summary ===");
for (const r of results) {
  console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
}

process.exit(results.every((r) => r.ok) ? 0 : 1);
