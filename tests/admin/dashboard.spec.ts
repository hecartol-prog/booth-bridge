import { test, expect } from '@playwright/test';
import { gotoApp } from '../helpers/auth';

test.describe('Admin dashboard', () => {
  test('shows control center overview and quick access links', async ({ page }) => {
    await gotoApp(page, '/admin');

    await expect(page.getByRole('heading', { name: /admin control center/i })).toBeVisible();
    await expect(page.getByText('All Systems Operational')).toBeVisible();
    await expect(page.getByText('Quick Access')).toBeVisible();
  });

  test('stat cards link to management pages', async ({ page }) => {
    await gotoApp(page, '/admin');

    await page.getByText('Total Users').click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
  });
});
