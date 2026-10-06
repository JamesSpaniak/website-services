import { expect, Page } from '@playwright/test';

export const CARDS = {
    success: '4242424242424242',
    decline: '4000000000009995', // insufficient funds
    threeDS: '4000002500003155', // requires authentication
};

export const COURSE_ID = Number(process.env.E2E_COURSE_ID ?? 1);

/**
 * Registers a fresh non-admin user through the API and logs in, so the auth
 * cookies land on the page's origin. Admins can't buy Pro, so never use one.
 */
export async function signUpAndLogIn(page: Page, prefix: string) {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const username = `e2e_${prefix}_${stamp}`;
    const password = 'E2eTestPassword123!';
    const register = await page.request.post('/api/auth/register', {
        data: { username, password, email: `${username}@example.com`, first_name: 'E2E', last_name: 'Buyer' },
    });
    expect(register.ok(), await register.text()).toBeTruthy();
    const login = await page.request.post('/api/auth/login', { data: { username, password } });
    expect(login.ok(), await login.text()).toBeTruthy();
    return { username, password };
}

/** Fills Stripe's hosted Checkout page and submits it. */
export async function payOnStripe(page: Page, card: string) {
    // Stripe's page "load" can stall on third-party scripts; the form is what matters.
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000, waitUntil: 'domcontentloaded' });
    await page
        .locator('#cardNumber, [data-testid="card-accordion-item-button"]')
        .first()
        .waitFor({ state: 'attached', timeout: 30_000 });

    // Checkout lists several methods (Card, Cash App, Klarna); pick Card.
    const cardNumber = page.locator('#cardNumber');
    if (!(await cardNumber.isVisible().catch(() => false))) {
        // A transparent accordion button covers the "Card" row.
        await page.locator('[data-testid="card-accordion-item-button"]').dispatchEvent('click');
    }

    await page.locator('#cardNumber').fill(card);
    await page.locator('#cardExpiry').fill('12 / 34');
    await page.locator('#cardCvc').fill('123');
    await page.locator('#billingName').fill('E2E Buyer');

    const country = page.locator('#billingCountry');
    if (await country.isVisible().catch(() => false)) {
        await country.selectOption('US');
    }
    const zip = page.locator('#billingPostalCode');
    if (await zip.isVisible().catch(() => false)) {
        await zip.fill('10001');
    }
    // Don't opt into Link — it would ask for a phone number.
    const link = page.getByRole('checkbox', { name: 'Save my information for faster checkout' });
    if (await link.isVisible().catch(() => false) && (await link.isChecked())) {
        await link.uncheck();
    }

    await page.locator('[data-testid="hosted-payment-submit-button"]').click();
}

/**
 * Approves Stripe's test 3D Secure challenge (rendered in nested iframes).
 * A click during the modal's open animation is ignored, so keep clicking
 * until the challenge goes away.
 */
export async function approve3DS(page: Page) {
    const deadline = Date.now() + 45_000;
    let clicked = false;
    while (Date.now() < deadline) {
        let visible = false;
        for (const frame of page.frames()) {
            const button = frame.getByRole('button', { name: /^complete$/i });
            if (await button.isVisible().catch(() => false)) {
                visible = true;
                await button.click().catch(() => undefined);
                clicked = true;
                break;
            }
        }
        if (clicked && !visible) return;
        await page.waitForTimeout(1_500);
    }
    throw new Error(clicked ? '3DS challenge did not close' : '3DS challenge did not appear');
}

/** Reloads /profile and checks the user is still signed in (no bounce to /login). */
export async function expectStillSignedIn(page: Page) {
    await page.goto('/profile');
    // Profile Pro card: "Go Pro" for non-members, "Manage billing" for Pro.
    await expect(page.getByRole('button', { name: /^(Go Pro|Manage billing)$/ })).toBeVisible();
    expect(page.url()).not.toContain('/login');
}

export async function getCourse(page: Page, courseId = COURSE_ID) {
    let response = await page.request.get(`/api/courses/${courseId}`);
    if (response.status() === 401) {
        // A purchase bumps token_version; refresh like api-client does, then retry.
        await page.request.post('/api/auth/refresh', { data: {} });
        response = await page.request.get(`/api/courses/${courseId}`);
    }
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as { has_access: boolean; price: number };
}
