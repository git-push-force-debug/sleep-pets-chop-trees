import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// One config for the whole repo. UI test files opt into jsdom with `// @vitest-environment jsdom`.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['{apps,packages,scripts}/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
  },
});
