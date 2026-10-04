import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the Stripe purchase flows (sandbox). Expects the local
 * stack already running — API on :3000, Next on :8080 — plus `stripe listen`
 * forwarding to localhost:3000/purchases/webhook. See
 * docs/tech/stripe-sandbox-test-plan.md § 5.1.
 */
export default defineConfig({
    testDir: './e2e',
    // Each test drives a real Stripe Checkout page and waits on webhooks.
    timeout: 120_000,
    expect: { timeout: 20_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
