import fs from "fs";
import path from "path";

const uiDir = "src/components/ui";
const files = fs.readdirSync(uiDir).filter((f) => f.endsWith(".jsx"));

function collectExports(content) {
  const names = new Set();

  for (const match of content.matchAll(/^export (?:const|function|class) (\w+)/gm)) {
    names.add(match[1]);
  }

  for (const match of content.matchAll(/^export \{([^}]+)\}/gm)) {
    for (const part of match[1].split(",")) {
      const token = part.trim();
      if (!token) continue;
      const exported = token.split(/\s+as\s+/i).pop()?.trim();
      if (exported) names.add(exported);
    }
  }

  return [...names];
}

let out = "";

for (const f of files) {
  const name = f.replace(".jsx", "");
  const mod = `@/components/ui/${name}`;
  const content = fs.readFileSync(path.join(uiDir, f), "utf8");
  const exports = collectExports(content);

  out += `declare module "${mod}" {\n`;
  for (const ex of exports) {
    if (ex.endsWith("Variants")) {
      out += `  export function ${ex}(...args: any[]): any;\n`;
    } else if (ex.startsWith("use")) {
      out += `  export function ${ex}(...args: any[]): any;\n`;
    } else {
      out += `  export const ${ex}: any;\n`;
    }
  }
  if (content.includes("export default")) {
    out += `  const _default: any;\n  export default _default;\n`;
  }
  out += `}\n\n`;
}

fs.mkdirSync("src/types", { recursive: true });
fs.writeFileSync("src/types/ui-components.d.ts", out);
console.log(`Wrote ${files.length} UI modules (${out.split("export ").length - 1} exports)`);
