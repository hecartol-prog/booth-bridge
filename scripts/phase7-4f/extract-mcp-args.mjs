import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name) {
  console.error("Usage: node extract-mcp-args.mjs <function-name>");
  process.exit(1);
}

const d = JSON.parse(
  fs.readFileSync(path.join(__dirname, "deploy-args", `${name}.json`), "utf8"),
);
const payload = {
  project_id: d.project_id,
  name: d.name,
  entrypoint_path: d.entrypoint_path,
  verify_jwt: d.verify_jwt,
  files: d.files,
};
process.stdout.write(JSON.stringify(payload));
