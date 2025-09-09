'use client';

import { logToServer } from './api-client';

const log = (level: 'log' | 'warn' | 'error', message: string, context: Record<string, any> = {}) => {
    // Always log to console for immediate feedback during development
    if (process.env.NODE_ENV === 'development') {
        console[level](`[${level.toUpperCase()}] ${message}`, context);
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
    info: (message: string, context?: Record<string, any>) => log('log', message, context),
    warn: (message: string, context?: Record<string, any>) => log('warn', message, context),
    error: (error: Error, context?: Record<string, any>) => {
        log('error', error.message, { ...context, stack: error.stack });
    },
};