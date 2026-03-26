import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    // Remove crossorigin attributes — file:// CORS blocks module scripts in Electron
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html: string) {
        return html.replace(/ crossorigin/g, '');
      },
    },
  ],
  base: './',  // Required for Electron file:// loading
  build: { outDir: 'build' },
  server: { port: 3000 },
});
