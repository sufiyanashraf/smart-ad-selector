import { test, expect } from '@playwright/test';

// ─── Landing Page Tests ─────────────────────────────────────────

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Use domcontentloaded to avoid waiting for the YouTube iframe to fully load
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('loads the landing page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/SmartAds/);
  });

  test('displays the hero headline', async ({ page }) => {
    await expect(page.locator('#lp-hero-h')).toBeVisible();
    await expect(page.locator('#lp-hero-h')).toContainText('Precision Targeting');
  });

  test('shows the navigation bar with key links', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Main"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Features', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Process', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tech', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Team', exact: true })).toBeVisible();
  });

  test('has a "Try Now" button that navigates to dashboard', async ({ page }) => {
    const tryNowBtn = page.getByRole('button', { name: /Try Now/i });
    await expect(tryNowBtn).toBeVisible();
    await tryNowBtn.click();
    await page.waitForURL(/\/dashboard/);
  });

  test('features section is present', async ({ page }) => {
    const featuresSection = page.locator('#features');
    await expect(featuresSection).toBeAttached();
  });

  test('team section shows all team members', async ({ page }) => {
    await expect(page.getByText('Abu Sufiyan')).toBeAttached();
    await expect(page.getByText('M. Aliyan H. Qureshi')).toBeAttached();
    await expect(page.getByText('Mahnoor Siddiqui')).toBeAttached();
  });

  test('footer displays copyright', async ({ page }) => {
    await expect(page.getByText(/© 2026 SmartAds/)).toBeAttached();
  });
});

// ─── Dashboard Tests ────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('loads the dashboard page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/SmartAds/);
  });

  test('displays the main dashboard content', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('does not show a crash or blank white page', async ({ page }) => {
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(50);
  });
});

// ─── Navigation Tests ───────────────────────────────────────────

test.describe('Navigation', () => {
  test('navigating to unknown route shows Not Found page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/404/)).toBeVisible();
  });

  test('can navigate from landing to dashboard and back', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click "Try Now" to go to dashboard
    await page.getByRole('button', { name: /Try Now/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Navigate back to landing via the browser
    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});
