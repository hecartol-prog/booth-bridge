import { test as setup } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buyerCreds, hasBuyerCreds } from './helpers/env';
import { loginWithEmail } from './helpers/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'buyer.json');

setup('authenticate buyer', async ({ page }) => {
  setup.skip(!hasBuyerCreds(), 'Set E2E_BUYER_EMAIL and E2E_BUYER_PASSWORD to run buyer tests');

  const { email, password } = buyerCreds();
  await loginWithEmail(page, email, password);
  await page.context().storageState({ path: authFile });
});
