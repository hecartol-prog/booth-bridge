import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap, gotoApp } from '../helpers/auth';
import { publicAuthPaths } from '../helpers/routes';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, '/login');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page).toHaveTitle(/Booth Bridge/i);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /^log in$/i })).toBeVisible();
  });

  test('shows validation for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /^log in$/i }).click();
    await expect(page.getByLabel('Email')).toBeFocused();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrong-password-123');
    await page.getByRole('button', { name: /^log in$/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('links to register and forgot password', async ({ page }) => {
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole('link', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await waitForAuthBootstrap(page);

    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('toggles password visibility', async ({ page }) => {
    const password = page.getByLabel('Password');
    await password.fill('secret-password');

    await expect(password).toHaveAttribute('type', 'password');
    await page.locator('#password').locator('xpath=..').getByRole('button').click();
    await expect(password).toHaveAttribute('type', 'text');
  });
});

test.describe('Public auth routes', () => {
  for (const route of publicAuthPaths) {
    test(`loads ${route.path}`, async ({ page }) => {
      await gotoApp(page, route.path);
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    });
  }
});
