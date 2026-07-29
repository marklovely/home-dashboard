import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/js/**/*.js', 'src/api/**/*.js', 'src/widgets/**/*.js', 'src/components/**/*.js', 'src/services/**/*.js'],
      exclude: ['src/js/app.js']
    }
  }
});
