// @ts-check
/**
 * E2E tests — Authentication flow
 * Run with: npx playwright test
 * Install: npx playwright install --with-deps
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Authentication', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"], input[name="username"]', 'invalid_user');
    await page.fill('input[type="password"]', 'wrong_password');
    await page.click('button[type="submit"]');
    // Either inline error or toast notification
    await expect(
      page.locator('[role="alert"], .toast, [data-testid="error"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await expect(page).toHaveURL(/login/);
  });
});
