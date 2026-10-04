import { NextRequest, NextResponse } from 'next/server';
import {
    ATTRIBUTION_COOKIE,
    ATTRIBUTION_MAX_AGE_SECONDS,
    ATTRIBUTION_PARAMS,
    ATTRIBUTION_VALUE_MAX,
    PROMO_CODE_PATTERN,
    PROMO_COOKIE,
    PROMO_MAX_AGE_SECONDS,
} from './app/lib/attribution';

/** Apex host only (no scheme). www.{this} is 301-redirected here for a single canonical origin. */
const CANONICAL_APEX_HOST = 'thedroneedge.com';
const WWW_HOST = `www.${CANONICAL_APEX_HOST}`;

/**
 * Decodes the JWT payload without cryptographic verification. The backend
 * performs full HMAC verification on every API call; this middleware only
 * gates page access so unauthorized users never receive protected bundles.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8'),
        );
    } catch {
        return null;
    }
}

interface RouteRule {
    prefix: string;
    /**
     * JWT `role` values that grant access. null means any authenticated user.
     * Org-level roles (manager/member) are NOT in the JWT; those routes only
     * require authentication here — the client-side guard and backend enforce
     * the actual org membership.
     */
    requiredRoles: string[] | null;
}

const PROTECTED_ROUTES: RouteRule[] = [
    { prefix: '/admin', requiredRoles: ['admin'] },
    { prefix: '/manager', requiredRoles: null },
];

/**
 * First-touch attribution (launch plan W5): when the landing URL carries any
 * UTM / click-id / ref param and no `de_attr` cookie exists yet, remember them
 * for 90 days. First touch wins — an existing cookie is never overwritten.
 * Not HttpOnly: `lib/attribution.ts` reads it client-side for page_view and
 * POST /leads. Next URL-encodes the cookie value, so the stored value is
 * encodeURIComponent(JSON).
 */
function withAttribution(request: NextRequest, response: NextResponse): NextResponse {
    withPromoCode(request, response);
    try {
        const { pathname, searchParams } = request.nextUrl;
        if (pathname.startsWith('/api/') || request.cookies.has(ATTRIBUTION_COOKIE)) return response;

        const attr: Record<string, string> = {};
        for (const key of ATTRIBUTION_PARAMS) {
            const value = searchParams.get(key)?.trim();
            if (value) attr[key] = value.slice(0, ATTRIBUTION_VALUE_MAX);
        }
        if (Object.keys(attr).length === 0) return response;

        attr.landing_path = pathname.slice(0, ATTRIBUTION_VALUE_MAX);
        attr.ts = new Date().toISOString();
        response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(attr), {
            path: '/',
            maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false,
        });
    } catch {
        /* attribution must never break routing */
    }
    return response;
}

/** `?promo=CODE` (T21): latest valid code wins, 30 days; checkout sends it to the backend. */
function withPromoCode(request: NextRequest, response: NextResponse): void {
    try {
        const { pathname, searchParams } = request.nextUrl;
        if (pathname.startsWith('/api/')) return;
        const code = searchParams.get('promo')?.trim();
        if (!code || !PROMO_CODE_PATTERN.test(code)) return;
        response.cookies.set(PROMO_COOKIE, code, {
            path: '/',
            maxAge: PROMO_MAX_AGE_SECONDS,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false,
        });
    } catch {
        /* a promo link must never break routing */
    }
}

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const pathname = url.pathname;

    const host = request.headers.get('host')?.replace(/:\d+$/, '').toLowerCase() ?? '';
    if (host === WWW_HOST) {
        // No cookie here: it would be scoped to www. The 301 keeps the query
        // string, so the apex request records attribution instead.
        const dest = url.clone();
        dest.hostname = CANONICAL_APEX_HOST;
        dest.protocol = 'https:';
        return NextResponse.redirect(dest, 301);
    }

    const rule = PROTECTED_ROUTES.find(r => pathname.startsWith(r.prefix));
    if (!rule) return withAttribution(request, NextResponse.next());

    // Protected-route bounces drop the query string, so record attribution on them too.
    const bounce = () => withAttribution(request, NextResponse.redirect(new URL('/', request.url)));

    const token = request.cookies.get('access_token')?.value;
    if (!token) {
        return bounce();
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
        return bounce();
    }

    if (rule.requiredRoles) {
        const role = payload.role as string | undefined;
        if (!role || !rule.requiredRoles.includes(role)) {
            return bounce();
        }
    }

    return withAttribution(request, NextResponse.next());
}

export const config = {
    // Run on all paths except Next image/static bundles so www→apex 301 applies site-wide.
    matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
