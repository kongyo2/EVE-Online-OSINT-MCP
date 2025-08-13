import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 10000, // 10 seconds timeout for all tests
    hookTimeout: 10000, // 10 seconds timeout for hooks
    teardownTimeout: 10000, // 10 seconds timeout for teardown
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    // Suppress unhandled promise rejection warnings in tests
    onConsoleLog: (log, type) => {
      if (type === 'stderr' && log.includes('PromiseRejectionHandledWarning')) {
        return false;
      }
    },
  },
});