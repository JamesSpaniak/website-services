'use client';

import { logToServer } from './api-client';

const log = (level: 'log' | 'warn' | 'error', message: string, context: Record<string, unknown> = {}) => {
    // Always log to console for immediate feedback during development
    if (process.env.NODE_ENV === 'development') {
        // For better readability in the browser console, we can group the logs.
        console.groupCollapsed(`[${level.toUpperCase()}] ${message}`);
        console.log('Context:', context);
        if ('stack' in context && typeof context.stack === 'string') {
            console.error(context.stack);
        }
        console.groupEnd();
    }

    // Send logs to the backend. This can be done in all environments.
    try {
        logToServer(level, message, {
            ...context,
            // Add browser-specific context
            url: typeof window !== 'undefined' ? window.location.href : 'N/A',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        });
    } catch (e) {
        // To prevent infinite loops, just log logger failures to the console.
        console.error('Failed to send log to server:', e);
    }
};

export const logger = {
    info: (message: string, context?: Record<string, unknown>) => log('log', message, context),
    warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
    error: (error: Error, context?: Record<string, unknown>) => {
        log('error', error.message, { ...context, stack: error.stack });
    },
};