import { expect, test } from '@playwright/test';
import { COURSE_ID, getCourse, signUpAndLogIn } from './helpers';

// CK1 one-click checkout: every buy button links to /checkout?item=…, which
// opens Stripe Checkout on load. These stop at Stripe — paying is covered by
// purchase-flows.spec.ts.

const STRIPE = /checkout\.stripe\.com/;

test('CK1 signed-in buyer reaches Stripe in one click from the course preview', async ({ page }) => {
    await signUpAndLogIn(page, 'ck1preview');
    await page.goto(`/courses/${COURSE_ID}/preview`);
    await page.getByRole('link', { name: /Unlock full course — \$/ }).click();
    await page.waitForURL(STRIPE, { waitUntil: 'domcontentloaded', timeout: 30_000 });
});

test('CK1 signed-in buyer reaches Stripe from the courses list', async ({ page }) => {
    await signUpAndLogIn(page, 'ck1list');
    await page.goto('/courses');
    await page.getByRole('link', { name: /^Purchase \$/ }).first().click();
    await page.waitForURL(STRIPE, { waitUntil: 'domcontentloaded', timeout: 30_000 });
});

test('CK1 Unit 1 learner reaches Stripe from the in-course banner and sidebar', async ({ page }) => {
    await signUpAndLogIn(page, 'ck1course');
    await page.goto(`/courses/${COURSE_ID}`);
    await page.getByRole('region', { name: 'Unlock full course' }).getByRole('link', { name: 'Unlock full course' }).click();
    await page.waitForURL(STRIPE, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await page.goto(`/courses/${COURSE_ID}`);
    await page.getByRole('link', { name: /^Unlock for \$/ }).click();
    await page.waitForURL(STRIPE, { waitUntil: 'domcontentloaded', timeout: 30_000 });
});

test('CK1 Pricing "Go Pro" opens Pro checkout and cancel returns to pricing', async ({ page }) => {
    await signUpAndLogIn(page, 'ck1pro');
    await page.goto('/pricing');
    await page.getByRole('link', { name: /^Go Pro — \$/ }).click();
    await page.waitForURL(STRIPE, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await page.getByRole('link', { name: /^Back to / }).click();
    await page.waitForURL(/localhost.*\/pricing/);
});

test('CK1 guest is sent to register, then straight on to Stripe', async ({ page }) => {
    await page.goto(`/checkout?item=course-${COURSE_ID}`);
    await page.waitForURL(/\/register\?redirect=/);
    await expect(page.getByText('Create account to purchase').first()).toBeVisible();

    const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await page.locator('#firstName').fill('E2E');
    await page.locator('#lastName').fill('Guest');
    await page.locator('#username').fill(`e2e_ck1guest_${stamp}`);
    await page.locator('#email').fill(`e2e_ck1guest_${stamp}@example.com`);
    await page.locator('#password').fill('E2eTestPassword123!');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(STRIPE, { waitUntil: 'domcontentloaded', timeout: 30_000 });
});

test('CK1 invalid item shows a message instead of redirecting', async ({ page }) => {
    await page.goto('/checkout?item=bogus');
    await expect(page.getByText('This checkout link is not valid.')).toBeVisible();
});

test('CK1 cancelling a course checkout returns to the course, not /checkout', async ({ page }) => {
    await signUpAndLogIn(page, 'ck1cancel');
    await page.goto(`/checkout?item=course-${COURSE_ID}`);
    await page.waitForURL(STRIPE, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await page.getByRole('link', { name: /^Back to / }).click();
    await page.waitForURL(new RegExp(`localhost.*/courses/${COURSE_ID}\\?purchase=1`));
    expect((await getCourse(page)).has_access).toBe(false);
});
