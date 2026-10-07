import { describe, expect, it } from 'vitest';
import {
  PRO_CHECKOUT_PATH,
  courseCheckoutPath,
  parseCheckoutItem,
  redirectIndicatesPurchase,
  registerHref,
  sanitizeRedirect,
} from './auth-redirect';

describe('checkout paths (CK1)', () => {
  it('builds course and Pro checkout links', () => {
    expect(courseCheckoutPath(35)).toBe('/checkout?item=course-35');
    expect(PRO_CHECKOUT_PATH).toBe('/checkout?item=pro');
  });

  it('parses valid items and rejects everything else', () => {
    expect(parseCheckoutItem('pro')).toEqual({ kind: 'pro' });
    expect(parseCheckoutItem('course-35')).toEqual({ kind: 'course', courseId: 35 });
    for (const bad of [null, '', 'course-', 'course-0', 'course-abc', 'course-35x', 'PRO', 'course-1234567890']) {
      expect(parseCheckoutItem(bad)).toBeNull();
    }
  });

  it('survives the register redirect round trip', () => {
    const redirect = new URL(registerHref(courseCheckoutPath(35)), 'http://local').searchParams.get('redirect');
    expect(sanitizeRedirect(redirect)).toBe('/checkout?item=course-35');
  });

  it('counts checkout links as purchase intent', () => {
    expect(redirectIndicatesPurchase(courseCheckoutPath(35))).toBe(true);
    expect(redirectIndicatesPurchase(PRO_CHECKOUT_PATH)).toBe(true);
    expect(redirectIndicatesPurchase('/courses/35?purchase=1')).toBe(true);
    expect(redirectIndicatesPurchase('/courses/35')).toBe(false);
  });
});
