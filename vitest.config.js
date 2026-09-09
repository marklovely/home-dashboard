import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    testTimeout: 120_000,
    teardownTimeout: 15_000,
    maxWorkers: process.env.CI ? 2 : undefined,
    exclude: ['**/node_modules/**', 'worker/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/js/**/*.js', 'src/api/**/*.js', 'src/widgets/**/*.js', 'src/components/**/*.js', 'src/services/**/*.js'],
      exclude: ['src/js/app.js']
    }
  }
});
