/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: {
    __BUILD_TS__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    host: true, // bind to 0.0.0.0 so ngrok and LAN can reach it
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // NOTE: No path rewrite — backend routes include /api prefix
      },
    },
    allowedHosts: [
      '49d9fb3b3815.ngrok-free.app',
      'garrulous-melaine-unattainable.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok-free.dev',
    ],
  },
});
