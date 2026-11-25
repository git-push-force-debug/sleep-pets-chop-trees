import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_* values come from the repo-root .env.local in development and from the deploy script in production.
export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  server: { port: 5174 },
  build: { chunkSizeWarningLimit: 900 },
});
