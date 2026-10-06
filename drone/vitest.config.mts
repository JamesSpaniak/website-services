import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Client unit tests (docs/tech/progress-tracking-accuracy.md Phase 2).
// Playwright end-to-end specs live in e2e/ and run with `npm run test:e2e`.
export default defineConfig({
    esbuild: { jsx: 'automatic' },
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
        restoreMocks: true,
    },
});
