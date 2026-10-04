import { expect, test } from '@playwright/test';
import {
    approve3DS,
    CARDS,
    COURSE_ID,
    expectStillSignedIn,
    getCourse,
    payOnStripe,
    signUpAndLogIn,
} from './helpers';

// Stripe sandbox click-through (docs/tech/stripe-sandbox-test-plan.md § 5.1).
// Each test uses a fresh user so purchases don't collide.

const SUCCESS_NOTICE = 'Payment received — you have full access';

test('T4 course purchase unlocks the course and keeps the user signed in', async ({ page }) => {
    await signUpAndLogIn(page, 'course');
    await page.goto(`/courses/${COURSE_ID}?purchase=1`);
    await page.getByRole('button', { name: /Buy this course — \$/ }).click();

    await payOnStripe(page, CARDS.success);

    await page.waitForURL(new RegExp(`/courses/${COURSE_ID}`), { timeout: 60_000 });
    await expect(page.getByText(SUCCESS_NOTICE)).toBeVisible({ timeout: 60_000 });
    expect((await getCourse(page)).has_access).toBe(true);

    await expectStillSignedIn(page);
});

test('T5 cancelling Checkout returns to the course without access', async ({ page }) => {
    await signUpAndLogIn(page, 'cancel');
    await page.goto(`/courses/${COURSE_ID}?purchase=1`);
    await page.getByRole('button', { name: /Buy this course — \$/ }).click();
    await page.waitForURL(/checkout\.stripe\.com/);

    await page.getByRole('link', { name: /^Back to / }).click();

    await page.waitForURL(new RegExp(`localhost.*/courses/${COURSE_ID}`));
    expect((await getCourse(page)).has_access).toBe(false);
    await expectStillSignedIn(page);
});

test('T3 declined card shows an error and grants nothing', async ({ page }) => {
    await signUpAndLogIn(page, 'decline');
    await page.goto(`/courses/${COURSE_ID}?purchase=1`);
    await page.getByRole('button', { name: /Buy this course — \$/ }).click();

    await payOnStripe(page, CARDS.decline);

    await expect(page.getByText(/declined|insufficient funds/i).first()).toBeVisible();
    expect(page.url()).toContain('checkout.stripe.com');
    expect((await getCourse(page)).has_access).toBe(false);
});

test('T3 3D Secure card completes after the challenge', async ({ page }) => {
    await signUpAndLogIn(page, 'threeds');
    await page.goto(`/courses/${COURSE_ID}?purchase=1`);
    await page.getByRole('button', { name: /Buy this course — \$/ }).click();

    await payOnStripe(page, CARDS.threeDS);
    await approve3DS(page);

    await page.waitForURL(new RegExp(`localhost.*/courses/${COURSE_ID}`), { timeout: 60_000 });
    await expect(page.getByText(SUCCESS_NOTICE)).toBeVisible({ timeout: 60_000 });
    await expectStillSignedIn(page);
});

test('T6 Pro upgrade + T8 billing portal cancel at period end', async ({ page }) => {
    await signUpAndLogIn(page, 'pro');
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Upgrade to Pro (monthly)' }).click();

    await payOnStripe(page, CARDS.success);

    await page.waitForURL(/\/profile/, { timeout: 60_000 });
    // The page polls, then falls back to confirm-pro-checkout if the webhook is late.
    await expect(page.getByText('Pro is active — every course is unlocked.')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Pro \(active until/)).toBeVisible();
    expect((await getCourse(page)).has_access).toBe(true);
    await expectStillSignedIn(page);

    // T8: cancel at period end in the Customer Portal, then come back.
    await page.getByRole('button', { name: 'Manage billing' }).click();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });
    await page.getByRole('link', { name: /Drone Edge Pro/ }).click();
    await page.getByRole('button', { name: /cancel (subscription|plan)/i }).first().click();
    // Confirm in the dialog / confirmation page.
    await page.getByRole('button', { name: /cancel (subscription|plan)/i }).last().click();
    await expect(page.getByText('Plan canceled')).toBeVisible();
    await expect(page.getByText(/You still have access until then/)).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('link', { name: /^Return to / }).click();

    await page.waitForURL(/localhost.*\/profile/, { timeout: 30_000 });
    // Pro stays until the period ends.
    await expect(page.getByText(/Pro \(active until/)).toBeVisible();
    expect((await getCourse(page)).has_access).toBe(true);
    await expectStillSignedIn(page);
});
