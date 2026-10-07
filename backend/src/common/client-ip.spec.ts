import { Request } from 'express';
import { clientIp, pickClient } from './client-ip';

const req = (xff: string | undefined, socket = '10.0.2.15') =>
  ({
    headers: xff === undefined ? {} : { 'x-forwarded-for': xff },
    socket: { remoteAddress: socket },
  }) as unknown as Request;

describe('clientIp', () => {
  const saved = process.env.TRUSTED_PROXY_HOPS;
  afterEach(() => {
    if (saved === undefined) delete process.env.TRUSTED_PROXY_HOPS;
    else process.env.TRUSTED_PROXY_HOPS = saved;
  });

  // viewer, CloudFront edge, Next.js task — what the API sees behind AWS.
  const real = '50.227.29.34, 130.176.1.1, 10.0.1.20';

  it('keeps the legacy first entry when TRUSTED_PROXY_HOPS is unset', () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    expect(clientIp(req(`1.2.3.4, ${real}`))).toBe('1.2.3.4');
  });

  it('ignores a spoofed prefix once the hop count is set', () => {
    process.env.TRUSTED_PROXY_HOPS = '3';
    expect(clientIp(req(real))).toBe('50.227.29.34');
    expect(clientIp(req(`1.2.3.4, 9.9.9.9, ${real}`))).toBe('50.227.29.34');
  });

  it('falls back to the socket peer with no header or zero hops', () => {
    process.env.TRUSTED_PROXY_HOPS = '3';
    expect(clientIp(req(undefined))).toBe('10.0.2.15');
    process.env.TRUSTED_PROXY_HOPS = '0';
    expect(clientIp(req(real))).toBe('10.0.2.15');
  });

  it('treats a junk hop value as unset', () => {
    process.env.TRUSTED_PROXY_HOPS = 'three';
    expect(clientIp(req(`1.2.3.4, ${real}`))).toBe('1.2.3.4');
  });
});

describe('pickClient', () => {
  it('uses the left-most entry when the chain is shorter than expected', () => {
    expect(pickClient(['8.8.8.8', '10.0.1.20'], 3)).toBe('8.8.8.8');
  });
});
