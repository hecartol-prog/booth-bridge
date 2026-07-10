import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';

test.describe('Admin login', () => {
  test('renders secure admin login page', async ({ page }) => {
    await page.goto('/admin-login');
    await waitForAuthBootstrap(page);

    await expect(page.getByRole('heading', { name: /boothbridge administration/i })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /secure sign in/i })).toBeVisible();
  });

  test('rejects invalid admin credentials', async ({ page }) => {
    await page.goto('/admin-login');
    await page.getByLabel('Email Address').fill('not-an-admin@example.com');
    await page.getByLabel('Password').fill('wrong-password-123');
    await page.getByRole('button', { name: /secure sign in/i }).click();

    await expect(page.getByText(/invalid|unauthorized|access denied|credentials/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin-login/);
  });

  test('redirects unauthenticated users from admin routes', async ({ page }) => {
    await page.goto('/admin');
    await waitForAuthBootstrap(page);
    await expect(page).toHaveURL(/\/admin-login/);
  });
});
