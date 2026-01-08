/**
 * E2E Test: Extension Popup Functionality
 * Tests the MDFlow popup interface and basic conversion
 */

import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionPath = path.resolve(__dirname, '../../dist');

test.describe('MDFlow Extension - Popup', () => {
    let context: BrowserContext;

    test.beforeAll(async () => {
        // Launch browser with extension
        context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('should load extension successfully', async () => {
        // Wait for service worker to be ready
        let serviceWorker = context.serviceWorkers()[0];
        if (!serviceWorker) {
            serviceWorker = await context.waitForEvent('serviceworker');
        }

        expect(serviceWorker).toBeDefined();
    });

    test('should open popup on test page', async () => {
        const page = await context.newPage();
        await page.goto('https://example.com');
        await page.waitForLoadState('domcontentloaded');

        // Verify page loaded
        const title = await page.title();
        expect(title).toContain('Example');

        // Get extension ID from service worker URL
        const serviceWorker = context.serviceWorkers()[0];
        const extensionId = serviceWorker.url().split('/')[2];

        // Open popup
        const popupPage = await context.newPage();
        await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
        await popupPage.waitForLoadState('domcontentloaded');

        // Verify popup loaded
        await expect(popupPage.locator('body')).toBeVisible();

        // Take screenshot
        await popupPage.screenshot({ path: 'tests/e2e/screenshots/popup.png' });

        await page.close();
        await popupPage.close();
    });

    test('should display popup UI elements', async () => {
        const serviceWorker = context.serviceWorkers()[0];
        const extensionId = serviceWorker.url().split('/')[2];

        const popupPage = await context.newPage();
        await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
        await popupPage.waitForLoadState('domcontentloaded');

        // Check for main elements
        const body = popupPage.locator('body');
        await expect(body).toBeVisible();

        // Take screenshot
        await popupPage.screenshot({ path: 'tests/e2e/screenshots/popup-ui.png' });

        await popupPage.close();
    });
});

test.describe('MDFlow Extension - Options Page', () => {
    let context: BrowserContext;

    test.beforeAll(async () => {
        context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('should open options page', async () => {
        let serviceWorker = context.serviceWorkers()[0];
        if (!serviceWorker) {
            serviceWorker = await context.waitForEvent('serviceworker');
        }
        const extensionId = serviceWorker.url().split('/')[2];

        const optionsPage = await context.newPage();
        await optionsPage.goto(`chrome-extension://${extensionId}/src/options/index.html`);
        await optionsPage.waitForLoadState('domcontentloaded');

        // Verify options page loaded
        await expect(optionsPage.locator('body')).toBeVisible();

        // Take screenshot
        await optionsPage.screenshot({ path: 'tests/e2e/screenshots/options.png' });

        await optionsPage.close();
    });
});

test.describe('MDFlow Extension - History Page', () => {
    let context: BrowserContext;

    test.beforeAll(async () => {
        context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('should open history page', async () => {
        let serviceWorker = context.serviceWorkers()[0];
        if (!serviceWorker) {
            serviceWorker = await context.waitForEvent('serviceworker');
        }
        const extensionId = serviceWorker.url().split('/')[2];

        const historyPage = await context.newPage();
        await historyPage.goto(`chrome-extension://${extensionId}/src/history/index.html`);
        await historyPage.waitForLoadState('domcontentloaded');

        // Verify history page loaded
        await expect(historyPage.locator('body')).toBeVisible();

        // Take screenshot
        await historyPage.screenshot({ path: 'tests/e2e/screenshots/history.png' });

        await historyPage.close();
    });
});
