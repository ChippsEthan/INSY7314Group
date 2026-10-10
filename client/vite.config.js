import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  server: {
    // Proxy API calls to the backend so we avoid CORS issues in dev
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        secure: false, // accept self-signed cert
        changeOrigin: true,
      },
    },
  },
});
