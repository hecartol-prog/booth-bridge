import { test as setup } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminCreds, hasAdminCreds } from './helpers/env';
import { loginAsAdmin } from './helpers/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'admin.json');

setup('authenticate admin', async ({ page }) => {
  setup.skip(!hasAdminCreds(), 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin tests');

  const { email, password } = adminCreds();
  await loginAsAdmin(page, email, password);
  await page.context().storageState({ path: authFile });
});
