/** Test discovery and minimum coverage required by the complete quality gate. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        branches: 80,
        functions: 100,
        lines: 100,
        statements: 99
      }
    }
  }
});
