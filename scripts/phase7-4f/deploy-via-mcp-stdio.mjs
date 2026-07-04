import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const names = process.argv.slice(2);
const FUNCTIONS =
  names.length > 0
    ? names
    : [
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

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@supabase/mcp-server-supabase@latest"],
});

const client = new Client({ name: "booth-bridge-deploy", version: "1.0.0" });
await client.connect(transport);

const results = [];

for (const name of FUNCTIONS) {
  const argsPath = path.join(__dirname, `deploy-args/${name}.json`);
  const args = JSON.parse(fs.readFileSync(argsPath, "utf8"));
  const payload = {
    project_id: args.project_id,
    name: args.name,
    entrypoint_path: args.entrypoint_path,
    verify_jwt: args.verify_jwt,
    files: args.files,
  };

  try {
    const response = await client.callTool({
      name: "deploy_edge_function",
      arguments: payload,
    });
    const text = response.content?.map((c) => c.text).join("\n") ?? "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
    const ok = !response.isError && !parsed?.error;
    results.push({ name, ok, response: parsed, isError: response.isError });
    console.log(`${ok ? "OK" : "FAIL"} ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, error: message });
    console.log(`FAIL ${name}: ${message}`);
  }
}

await client.close();
fs.writeFileSync(
  path.join(__dirname, "deploy-mcp-results.json"),
  JSON.stringify(results, null, 2),
);
process.exit(results.every((r) => r.ok) ? 0 : 1);
