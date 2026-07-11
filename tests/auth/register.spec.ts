import { test, expect } from '@playwright/test';
import { gotoApp } from '../helpers/auth';

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, '/register');
  });

  test('renders registration form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('validates password mismatch', async ({ page }) => {
    await page.getByLabel('Email').fill('new-user@example.com');
    await page.getByLabel('Password', { exact: true }).fill('ValidPass123!');
    await page.getByLabel('Confirm Password').fill('DifferentPass123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('validates short password', async ({ page }) => {
    await page.getByLabel('Email').fill('new-user@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm Password').fill('short');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();
  });

  test('links back to login', async ({ page }) => {
    await page.getByRole('link', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
