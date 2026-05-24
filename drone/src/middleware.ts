import { NextRequest, NextResponse } from 'next/server';

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

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const pathname = url.pathname;

    const host = request.headers.get('host')?.replace(/:\d+$/, '').toLowerCase() ?? '';
    if (host === WWW_HOST) {
        const dest = url.clone();
        dest.hostname = CANONICAL_APEX_HOST;
        dest.protocol = 'https:';
        return NextResponse.redirect(dest, 301);
    }

    const rule = PROTECTED_ROUTES.find(r => pathname.startsWith(r.prefix));
    if (!rule) return NextResponse.next();

    const token = request.cookies.get('access_token')?.value;
    if (!token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (rule.requiredRoles) {
        const role = payload.role as string | undefined;
        if (!role || !rule.requiredRoles.includes(role)) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // Run on all paths except Next image/static bundles so www→apex 301 applies site-wide.
    matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
