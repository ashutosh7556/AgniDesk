import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      /**
       * PWA: installable app + offline app shell.
       * The service worker precaches ONLY the built app files (HTML/JS/CSS/icons).
       * API calls are never cached: business data and logins always come fresh
       * from the server (and the API lives on another origin in production).
       */
      VitePWA({
        registerType: 'prompt', // show "update available" instead of reloading under the user
        injectRegister: false, // registered in src/pwa/ via useRegisterSW
        includeAssets: ['favicon.svg', 'icons/favicon-32x32.png', 'icons/apple-touch-icon-180x180.png'],
        manifest: {
          id: '/',
          name: 'AgniDesk — Agni Setu Fire Safety',
          short_name: 'AgniDesk',
          description: 'Business management for Agni Setu Fire Safety: customers, quotations, invoices, stock, services and reports.',
          lang: 'en-IN',
          start_url: '/dashboard',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          background_color: '#0f172a',
          theme_color: '#0f172a',
          categories: ['business', 'productivity'],
          icons: [
            { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'New Invoice', short_name: 'Invoice', url: '/invoices/new', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
            { name: 'New Quotation', short_name: 'Quotation', url: '/quotations/new', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
            { name: 'Customers', short_name: 'Customers', url: '/customers', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [], // nothing else is cached — especially not API responses
        },
        devOptions: { enabled: false },
      }),
    ],
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
