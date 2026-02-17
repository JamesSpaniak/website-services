import { NextRequest, NextResponse } from 'next/server';

const getTargetBase = () => {
  const base = process.env.API_INTERNAL_BASE_URL;
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

  const init: RequestInit = {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
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
