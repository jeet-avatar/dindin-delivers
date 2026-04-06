import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5180,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  test: {
    environment: 'happy-dom',  // matches browser environment; 'node' would break any DOM tests
  },
});
