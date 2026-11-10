import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from /<repo-name>/, so asset paths need that base.
export default defineConfig({
  base: '/navalstrategygame/',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
