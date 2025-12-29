import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// NO LOCAL PROXY - Always use cloud endpoints via VITE_API_URL env var
// Production: VITE_API_URL=https://api.dollor.ai
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
