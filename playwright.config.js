import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { loadLifecycleEnv } from './e2e/lib/loadLifecycleEnv.js';

loadLifecycleEnv(process.env, join(dirname(fileURLToPath(import.meta.url)), 'terraform/environments/hub.tfvars'));

export default defineConfig({
  testDir: './e2e',
  timeout: 90 * 60 * 1000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.MARKETING_ORIGIN || 'https://lovely-home.co.uk',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 45_000,
    navigationTimeout: 90_000,
    launchOptions: {
      args: ['--disable-blink-features=AutomationControlled']
    }
  }
});
