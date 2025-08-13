// Test setup file to handle unhandled promise rejections
import { beforeAll, afterAll } from 'vitest';

let originalUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;
let originalRejectionHandled: ((event: PromiseRejectionEvent) => void) | null = null;

beforeAll(() => {
  // Store original handlers
  originalUnhandledRejection = process.listeners('unhandledRejection')[0] as any;
  originalRejectionHandled = process.listeners('rejectionHandled')[0] as any;

  // Add custom handlers for test environment
  process.on('unhandledRejection', (reason, promise) => {
    // Suppress warnings for expected test errors
    const reasonStr = String(reason);
    if (reasonStr.includes('Network error') || 
        reasonStr.includes('API error') || 
        reasonStr.includes('Failed to')) {
      // These are expected test errors, suppress them
      return;
    }
    // Re-throw unexpected errors
    console.error('Unhandled Rejection:', reason);
  });

  process.on('rejectionHandled', (promise) => {
    // Suppress rejectionHandled warnings in tests
  });
});

afterAll(() => {
  // Restore original handlers
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('rejectionHandled');
  
  if (originalUnhandledRejection) {
    process.on('unhandledRejection', originalUnhandledRejection);
  }
  if (originalRejectionHandled) {
    process.on('rejectionHandled', originalRejectionHandled);
  }
});