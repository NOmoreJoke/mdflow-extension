import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,
    retries: 0,
    use: {
        headless: false,
        viewport: { width: 1280, height: 720 },
        screenshot: 'on',
        video: 'on',
    },
    projects: [
        {
            name: 'chromium-extension',
            use: {
                browserName: 'chromium',
                launchOptions: {
                    args: [
                        `--disable-extensions-except=${path.resolve(__dirname, 'dist')}`,
                        `--load-extension=${path.resolve(__dirname, 'dist')}`,
                    ],
                },
            },
        },
    ],
});
