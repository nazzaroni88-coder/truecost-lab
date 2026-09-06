/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Set VITE_BASE_PATH=/truecost/ to host the app under a sub-path of an existing site.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  server: { port: 5173, strictPort: false },
  build: { target: 'es2020', sourcemap: false },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
