import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

function loadEnvFile(filename: string) {
  const filePath = path.join(rootDir, filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function loadProjectEnv() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
}

export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
}

export function requireSupabaseEnv() {
  if (!hasSupabaseEnv()) {
    throw new Error(
      'Playwright tests require VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
        'Add them to .env.local or export them in your shell before running npm run test:e2e.',
    );
  }
}
