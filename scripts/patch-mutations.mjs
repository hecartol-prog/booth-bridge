import fs from "fs";
import path from "path";

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let changed = 0;

for (const file of walk("src")) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;

  content = content.replace(
    /mutationFn:\s*\(\{/g,
    "mutationFn: (/** @type {any} */ {",
  );
  content = content.replace(
    /mutationFn:\s*async\s*\(\{/g,
    "mutationFn: async (/** @type {any} */ {",
  );
  content = content.replace(
    /mutationFn:\s*\((\w+)\)\s*=>/g,
    "mutationFn: (/** @type {any} */ $1) =>",
  );
  content = content.replace(
    /mutationFn:\s*async\s*\((\w+)\)\s*=>/g,
    "mutationFn: async (/** @type {any} */ $1) =>",
  );
  content = content.replace(
    /mutationFn:\s*(\w+)\s*=>/g,
    "mutationFn: (/** @type {any} */ $1) =>",
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    changed += 1;
  }
}

console.log(`patched ${changed} files`);
