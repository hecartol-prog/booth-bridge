import fs from "node:fs";
import path from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: node read-deploy-args.mjs <function-name>");
  process.exit(1);
}

const file = path.join("scripts", "phase7-4f", "deploy-args", `${name}.json`);
const d = JSON.parse(fs.readFileSync(file, "utf8"));
const payload = {
  project_id: d.project_id,
  name: d.name,
  entrypoint_path: d.entrypoint_path,
  verify_jwt: d.verify_jwt,
  files: d.files,
};
process.stdout.write(JSON.stringify(payload));
