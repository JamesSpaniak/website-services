import { NextRequest, NextResponse } from 'next/server';

const getTargetBase = () => {
  const base = process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

  if (!base) {
    throw new Error('API_INTERNAL_BASE_URL is not set');
  }
  return base.replace(/\/$/, '');
};

const handler = async (req: NextRequest) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\//, '');
  const targetUrl = `${getTargetBase()}/${path}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
    // Ensure backend receives JSON with correct Content-Type when forwarding (CloudFront may strip it)
    if (body?.trim().startsWith('{') && !headers.has('content-type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    body,
  };

  const response = await fetch(targetUrl, init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
