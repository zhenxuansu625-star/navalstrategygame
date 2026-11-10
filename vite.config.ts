import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from /<repo-name>/, so asset paths need that base.
export default defineConfig({
  base: '/navalstrategygame/',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
