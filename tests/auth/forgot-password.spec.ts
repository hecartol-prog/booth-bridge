import { test, expect } from '@playwright/test';
import { gotoApp, gotoPath } from '../helpers/auth';

test.describe('Forgot password', () => {
  test('submits reset request and shows confirmation', async ({ page }) => {
    await gotoApp(page, '/forgot-password');

    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByText(/password reset link/i)).toBeVisible({ timeout: 15_000 });
  });

  test('links back to login', async ({ page }) => {
    await gotoPath(page, '/forgot-password');
    await page.getByRole('link', { name: /back to login/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Reset password page', () => {
  test('shows invalid link state without token', async ({ page }) => {
    await gotoApp(page, '/reset-password');

    await expect(page.getByText(/invalid reset link/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /request a new link/i })).toBeVisible();
  });
});
