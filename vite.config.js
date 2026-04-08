import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'version-stamp',
      buildStart() {
        const version = JSON.stringify({
          version: Date.now().toString(36),
          buildTime: new Date().toISOString(),
        })
        fs.writeFileSync('public/version.json', version)
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-icon-dark.png', 'logo-icon-light.png', 'logo-full-dark.png', 'logo-full-light.png'],
      manifest: {
        name: 'Fluentia Academy — أكاديمية طلاقة',
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
          { src: '/logo-icon-dark.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-icon-dark.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo-icon-dark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        importScripts: ['/push-sw.js'],
        maximumFileSizeToCacheInBytes: 1.5 * 1024 * 1024,
        // Only precache essential files — not every JS chunk
        globPatterns: ['**/*.{css,html,ico,png,svg,woff2}', 'push-sw.js'],
        runtimeCaching: [
          // Cache JS chunks on first use (not precached — loads faster on install)
          {
            urlPattern: /\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'js-chunks',
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
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
