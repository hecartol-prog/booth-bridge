import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './tests/helpers/load-env';

loadProjectEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, 'playwright', '.auth');

for (const file of ['exhibitor.json', 'buyer.json', 'admin.json']) {
  const filePath = path.join(authDir, file);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ cookies: [], origins: [] }));
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5199';
const useLocalWebServer = baseURL.includes('127.0.0.1') || baseURL.includes('localhost');
const hasExhibitorCreds = Boolean(process.env.E2E_EXHIBITOR_EMAIL && process.env.E2E_EXHIBITOR_PASSWORD);
const hasBuyerCreds = Boolean(process.env.E2E_BUYER_EMAIL && process.env.E2E_BUYER_PASSWORD);
const hasAdminCreds = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

const desktopChrome = { ...devices['Desktop Chrome'] };

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup-exhibitor',
      testMatch: /auth\.exhibitor\.setup\.ts/,
    },
    {
      name: 'setup-buyer',
      testMatch: /auth\.buyer\.setup\.ts/,
    },
    {
      name: 'setup-admin',
      testMatch: /auth\.admin\.setup\.ts/,
    },
    {
      name: 'public',
      testMatch: /\/(auth|public|smoke|navigation)\/.*\.spec\.ts|admin\/login\.spec\.ts/,
      use: desktopChrome,
    },
    {
      name: 'exhibitor',
      testMatch: hasExhibitorCreds ? /\/exhibitor\/.*\.spec\.ts/ : [],
      dependencies: ['setup-exhibitor'],
      use: {
        ...desktopChrome,
        storageState: path.join(authDir, 'exhibitor.json'),
      },
    },
    {
      name: 'buyer',
      testMatch: hasBuyerCreds ? /\/buyer\/.*\.spec\.ts/ : [],
      dependencies: ['setup-buyer'],
      use: {
        ...desktopChrome,
        storageState: path.join(authDir, 'buyer.json'),
      },
    },
    {
      name: 'admin',
      testMatch: hasAdminCreds ? /\/admin\/(dashboard|routes)\.spec\.ts/ : [],
      dependencies: ['setup-admin'],
      use: {
        ...desktopChrome,
        storageState: path.join(authDir, 'admin.json'),
      },
    },
    ...(process.env.CI
      ? []
      : [
          {
            name: 'firefox',
            testMatch: /\/(auth|public|smoke|navigation)\/.*\.spec\.ts|admin\/login\.spec\.ts/,
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            testMatch: /\/(auth|public|smoke|navigation)\/.*\.spec\.ts|admin\/login\.spec\.ts/,
            use: { ...devices['Desktop Safari'] },
          },
        ]),
  ],
  ...(useLocalWebServer
    ? {
        webServer: {
          command: 'npm run dev -- --host 127.0.0.1 --port 5199 --strictPort',
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            ...process.env,
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
            VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
            VITE_APP_URL: process.env.VITE_APP_URL ?? baseURL,
          },
        },
      }
    : {}),
});
