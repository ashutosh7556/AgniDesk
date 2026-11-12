import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // In development, /api calls are proxied to the Express backend,
      // so the browser sees a single origin and no CORS setup is needed locally.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
