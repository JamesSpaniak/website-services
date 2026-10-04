/**
 * First-touch marketing attribution (launch plan W5).
 *
 * `middleware.ts` writes the `de_attr` cookie on the first request that carries
 * UTM / click-id / ref params (first touch wins, 90 days, not HttpOnly so the
 * client can read it). This module holds the shared constants and the
 * client-side reader used by `trackPageView` and `WaitlistForm`.
 */

export const ATTRIBUTION_COOKIE = 'de_attr';
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
/** Query params captured on landing. */
export const ATTRIBUTION_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'ref',
] as const;
export const ATTRIBUTION_VALUE_MAX = 200;

/**
 * Launch promo code (T21) from a `?promo=CODE` link. Separate from `de_attr`
 * because the latest code wins (a buyer may see several posts) and it is sent
 * with checkout; the backend pre-applies it if Stripe knows it.
 */
export const PROMO_COOKIE = 'de_promo';
export const PROMO_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Parses the `de_attr` cookie in the browser. Returns string-valued fields only
 * (`utm_*`, `gclid`, `fbclid`, `ref`, `landing_path`, `ts`), or null when absent
 * or unreadable. Never throws.
 */
export function readAttribution(): Record<string, string> | null {
    if (typeof document === 'undefined') return null;
    try {
        const prefix = `${ATTRIBUTION_COOKIE}=`;
        const raw = document.cookie
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith(prefix));
        if (!raw) return null;
        let value = raw.slice(prefix.length);
        // Middleware stores encodeURIComponent(JSON); Next's cookie serializer may
        // encode it once more — decode until it parses as JSON.
        for (let i = 0; i < 2 && !value.startsWith('{'); i++) value = decodeURIComponent(value);
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === 'string' && v) out[k] = v.slice(0, ATTRIBUTION_VALUE_MAX);
        }
        return Object.keys(out).length ? out : null;
    } catch {
        return null;
    }
}

/** Fields forwarded with a lead (POST /leads) — attribution params + landing path. */
export function leadAttributionFields(): Record<string, string> {
    const attr = readAttribution();
    if (!attr) return {};
    const out: Record<string, string> = {};
    for (const key of [...ATTRIBUTION_PARAMS, 'landing_path'] as const) {
        if (attr[key]) out[key] = attr[key];
    }
    return out;
}

/** Small subset attached to `page_view` properties to keep the payload light. */
export function pageViewAttributionFields(): Record<string, string> {
    const attr = readAttribution();
    if (!attr) return {};
    const out: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'ref'] as const) {
        if (attr[key]) out[key] = attr[key];
    }
    return out;
}

/** Promo code saved from a `?promo=` link, or undefined. Never throws. */
export function readPromoCode(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const prefix = `${PROMO_COOKIE}=`;
    const raw = document.cookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(prefix));
    if (!raw) return undefined;
    try {
        const code = decodeURIComponent(raw.slice(prefix.length));
        return PROMO_CODE_PATTERN.test(code) ? code : undefined;
    } catch {
        return undefined;
    }
}
