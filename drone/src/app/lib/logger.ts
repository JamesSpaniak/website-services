'use client';

import { logToServer } from './api-client';

const IS_DEV = process.env.NODE_ENV === 'development';

/** Verbose console + debugLog() — set NEXT_PUBLIC_DEBUG_LOGGING in env to enable. */
const DEBUG_ENABLED =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_DEBUG_LOGGING !== undefined &&
  process.env.NEXT_PUBLIC_DEBUG_LOGGING !== '';

/** Ship info-level lines to backend (default off in production). */
const CLIENT_SEND_INFO_LOGS =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CLIENT_SEND_INFO_LOGS === 'true';

const LOG_API_TIMINGS =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOG_API_TIMINGS === 'true';

function shouldShipToServer(
  level: 'log' | 'warn' | 'error',
  message: string,
): boolean {
  if (level === 'warn' || level === 'error') return true;
  if (level === 'log' && CLIENT_SEND_INFO_LOGS) return true;
  if (level === 'log' && LOG_API_TIMINGS && message.startsWith('API Request:')) return true;
  return false;
}

/**
 * Debug-only logging. No output when NEXT_PUBLIC_DEBUG_LOGGING is unset (including production).
 */
export function debugLog(label: string, ...args: unknown[]): void {
  if (!DEBUG_ENABLED) return;
  if (IS_DEV) {
    console.log(`[debug] ${label}`, ...args);
  }
}

const log = (
  level: 'log' | 'warn' | 'error',
  message: string,
  context: Record<string, unknown> = {},
) => {
  if (IS_DEV) {
    console.groupCollapsed(`[${level.toUpperCase()}] ${message}`);
    console.log('Context:', context);
    if (typeof context.stack === 'string') {
      console.error(context.stack);
    }
    console.groupEnd();
  } else if (level === 'error') {
    console.error(`[ERROR] ${message}`, context);
  } else if (level === 'warn') {
    console.warn(`[WARN] ${message}`, context);
  }

  if (!shouldShipToServer(level, message)) return;

  try {
    logToServer(level, message, {
      ...context,
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    });
  } catch (e) {
    console.error('Failed to send log to server:', e);
  }
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    log('log', message, context ?? {}),
  warn: (message: string, context?: Record<string, unknown>) =>
    log('warn', message, context ?? {}),
  error: (error: Error, context?: Record<string, unknown>) => {
    log('error', error.message, { ...context, stack: error.stack });
  },
};
