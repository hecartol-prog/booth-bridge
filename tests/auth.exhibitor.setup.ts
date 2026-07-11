import { test as setup } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exhibitorCreds, hasExhibitorCreds } from './helpers/env';
import { loginWithEmail } from './helpers/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'exhibitor.json');

setup('authenticate exhibitor', async ({ page }) => {
  setup.skip(!hasExhibitorCreds(), 'Set E2E_EXHIBITOR_EMAIL and E2E_EXHIBITOR_PASSWORD to run exhibitor tests');

  const { email, password } = exhibitorCreds();
  await loginWithEmail(page, email, password);
  await page.context().storageState({ path: authFile });
});
