import fs from "node:fs";
import path from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: node read-mcp-payload.mjs <function-name>");
  process.exit(1);
}

const payloadPath = path.resolve(
  import.meta.dirname,
  "mcp-payloads",
  `${name}.json`,
);
process.stdout.write(fs.readFileSync(payloadPath, "utf8"));
