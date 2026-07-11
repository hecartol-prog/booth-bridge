import { expect, type Page } from '@playwright/test';

export async function gotoPath(page: Page, path: string) {
  return page.goto(path, { waitUntil: 'domcontentloaded' });
}

export async function waitForAuthBootstrap(page: Page) {
  await page.waitForLoadState('domcontentloaded');

  const spinner = page.locator('.animate-spin').first();
  if (await spinner.isVisible().catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {});
  }

  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root');
      return Boolean(root && root.textContent && root.textContent.trim().length > 20);
    },
    undefined,
    { timeout: 45_000 },
  );
}

export async function gotoApp(page: Page, path: string) {
  await gotoPath(page, path);
  await waitForAuthBootstrap(page);
}

export async function loginWithEmail(page: Page, email: string, password: string) {
  await gotoApp(page, '/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^log in$/i }).click();

  await expect(page).not.toHaveURL(/\/login$/);
  await waitForAuthBootstrap(page);
}

export async function loginAsAdmin(page: Page, email: string, password: string) {
  await gotoApp(page, '/admin-login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /secure sign in/i }).click();

  await expect(page).toHaveURL(/\/admin/);
  await waitForAuthBootstrap(page);
}

export async function logoutFromApp(page: Page) {
  const logoutButton = page.getByRole('button', { name: /log out/i });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/login/);
    return;
  }

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await gotoPath(page, '/login');
}
