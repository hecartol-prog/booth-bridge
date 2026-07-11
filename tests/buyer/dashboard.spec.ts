import { test, expect } from '@playwright/test';
import { gotoApp } from '../helpers/auth';

test.describe('Buyer dashboard', () => {
  test('shows personalized greeting and sourcing project CTA', async ({ page }) => {
    await gotoApp(page, '/');

    await expect(page.getByRole('heading', { name: /hey|trade show brain/i })).toBeVisible();
    await expect(page.getByText('New Sourcing Project')).toBeVisible();
  });

  test('opens scan booth flow from dashboard', async ({ page }) => {
    await gotoApp(page, '/');

    await page.getByRole('link', { name: /qr scan/i }).click();
    await expect(page).toHaveURL(/\/scan/);
    await expect(page.getByRole('heading', { name: /visit a booth/i })).toBeVisible();
  });
});
