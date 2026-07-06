import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

// Single source of truth for this build's version. Written to version.json AND
// embedded into the bundle as __BUILD_VERSION__, so the running code knows its
// OWN version and can reliably detect a newer deploy (fixes the stale-PWA bug
// where the updater baselined to the remote version and never noticed it was
// running old code).
const BUILD_VERSION = Date.now().toString(36)

export default defineConfig(({ mode }) => ({
  // In production, strip all console.* and debugger statements.
  // The codebase has ~236 console calls (mostly error/warn for dev diagnostics);
  // leaving them in shipped JS adds bytes, parse cost, and runtime overhead
  // on hot paths. esbuild's `drop` is safer than sed-deleting them from source
  // since dev builds still log normally.
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [
    react(),
    {
      name: 'version-stamp',
      buildStart() {
        fs.writeFileSync('public/version.json', JSON.stringify({
          version: BUILD_VERSION,
          buildTime: new Date().toISOString(),
        }))
      },
    },
    VitePWA({
      // 'prompt' (NOT 'autoUpdate'): a freshly-deployed service worker must NOT
      // seize the live tab and reload it mid-activity (that was cutting audio /
      // recordings and making "الشاشه ماهي ثابته"). The app's own UpdateBanner is
      // the SINGLE updater — it applies the new build only at a navigation
      // boundary, never mid-page.
      registerType: 'prompt',
      includeAssets: ['logo-icon-dark.png', 'logo-icon-light.png', 'logo-full-dark.png', 'logo-full-light.png', 'brand/fluentia-mark.svg', 'brand/icon-192.png', 'brand/icon-512.png', 'brand/apple-touch-icon.png'],
      manifest: {
        name: 'Fluentia | طلاقة',
        short_name: 'Fluentia',
        description: 'منصة تعلم الإنجليزية — أكاديمية طلاقة',
        theme_color: '#060e1c',
        background_color: '#060e1c',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'ar',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        importScripts: ['/push-sw.js'],
        maximumFileSizeToCacheInBytes: 1.5 * 1024 * 1024,
        // skipWaiting:false — a new SW must NOT activate + seize the live tab and
        // force a reload mid-audio/mid-recording. It waits; the app's UpdateBanner
        // performs the swap at a safe navigation boundary. (clientsClaim only
        // matters once activated, which now waits, so it can't grab a live tab.)
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        // Only precache essential files — not every JS chunk
        globPatterns: ['**/*.{css,html,ico,png,svg,woff2}', 'push-sw.js'],
        globIgnores: ['**/eruda*', '**/debug*'],
        runtimeCaching: [
          // ── MEDIA (audio/video) is intentionally NOT cached here. THE listening fix. ──
          // Safari/iOS play media via HTTP Range requests. The supabase-storage rule
          // below USED to be CacheFirst on ALL storage (incl. the listening .mp3s); a
          // CacheFirst SW serves a cached non-range body that Safari/WebKit REFUSES →
          // the <audio> stalls at readyState 0 and "press play does nothing / no sound".
          // Chrome tolerates it, Safari does not — which is why this survived every
          // prior fix and broke only on the students' iPhones / Mac Safari. Proven by a
          // serviceWorkers:'block' WebKit test: same build, blocked SW loads+plays
          // (duration 100s, currentTime advances), allowed SW stalls at 0.
          // FIX: the storage rule below now matches ONLY images, so media URLs match NO
          // route → the SW never touches them → the browser does native range requests
          // straight against the Supabase CDN (proper 206). NOTE a NetworkOnly RegExp
          // does NOT work here: workbox ignores END-anchored RegExp routes for
          // cross-origin requests (so /\.mp3$/ never matched the Supabase URL), and even
          // when matched the SW still proxies the stream — leaving media UNROUTED is the
          // proven native-passthrough behaviour.
          // Cache JS chunks — NetworkFirst ensures fresh code after deployments.
          // Was StaleWhileRevalidate which served stale/broken JS immediately,
          // causing "stuck loading" and blank pages after new deployments.
          {
            urlPattern: /\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-chunks',
              networkTimeoutSeconds: 3, // Fall back to cache after 3s (offline/slow)
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Supabase API — always go to network, no caching (prevents stale data bugs)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          // Supabase storage — cache IMAGES ONLY. Audio/video are deliberately excluded
          // (their extensions are not in this pattern) so they match NO route and bypass
          // the SW entirely → native HTTP Range requests work on Safari/iOS. THE fix.
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*\.(png|jpe?g|webp|gif|svg|avif|ico)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    modulePreload: { polyfill: true },
    // Charts (recharts) and eruda debug console chunks exceed 500 kB — both
    // are only loaded on-demand (admin analytics / ?debug=1), so the warning
    // is noise, not a problem worth chasing.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
          'vendor-zustand': ['zustand'],
          'vendor-charts': ['recharts'],
          // clsx is shared by the eager nav AND recharts — without its own chunk
          // Rollup hoists it INTO vendor-charts, forcing every first load to
          // download the whole 115 kB chart bundle just for className joining.
          'vendor-clsx': ['clsx'],
          'vendor-dates': ['date-fns'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}))
