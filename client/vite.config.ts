// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import * as path from 'node:path'
import devtools from 'solid-devtools/vite'
import checker from 'vite-plugin-checker'
import { VitePWA } from 'vite-plugin-pwa'
import solidPlugin from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  plugins: [
    devtools({
      autoname: true,
      locator: {
        key: 'Alt',
        jsxLocation: true,
        componentLocation: true,
      },
    }),
    solidPlugin(),
    tailwindcss(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,

        // Aggressive caching for offline support
        navigateFallback: undefined, // We'll handle offline via router

        runtimeCaching: [
          // API calls - Network first with fallback
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Images - Cache first with fallback
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Fonts - Cache first
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      includeAssets: [
        'img/favicon.ico',
        'img/favicon-16x16.png',
        'img/favicon-32x32.png',
        'img/apple-touch-icon.png',
        'img/android-chrome-192x192.png',
        'img/android-chrome-512x512.png',
      ],

      manifest: {
        name: 'Agent X - Trading Platform',
        short_name: 'Agent X',
        description:
          'Trading tools and market analysis platform for automated trading workflows',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'any',
        categories: ['finance', 'productivity', 'business'],

        // PWA Icons (following best practices)
        icons: [
          // Standard PWA icons
          {
            src: '/img/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/img/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          // Maskable icon for adaptive icons on Android
          {
            src: '/img/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        // App shortcuts for quick actions
        shortcuts: [
          {
            name: 'Home',
            short_name: 'Home',
            description: 'Go to home page',
            url: '/',
            icons: [
              {
                src: '/img/android-chrome-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],

        // Mobile optimizations
        id: '/',
        dir: 'ltr',
        lang: 'en',
        prefer_related_applications: false,
      },

      // Enable PWA in development for testing
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
    process.env.VITEST
      ? undefined
      : checker({
        typescript: true,
      }),
  ],
  resolve: {
    conditions: ['browser', 'import', 'module', 'default'],
    alias: {
      '#router': path.resolve(__dirname, './src/Router.tsx'),
      '#components': path.resolve(__dirname, './src/components'),
      '#stores': path.resolve(__dirname, './src/stores'),
      '#utils': path.resolve(__dirname, './src/utils'),
      '#api': path.resolve(__dirname, './src/api'),
      '#auth': path.resolve(__dirname, './src/auth'),
      '#alerts': path.resolve(__dirname, './src/alerts'),
      '#history': path.resolve(__dirname, './src/history'),
      '#strategies': path.resolve(__dirname, './src/strategies'),
      '#watchlist': path.resolve(__dirname, './src/watchlist'),
      '#chat': path.resolve(__dirname, './src/chat'),
      '#news': path.resolve(__dirname, './src/news'),
      '#settings': path.resolve(__dirname, './src/settings'),
      '#analytics': path.resolve(__dirname, './src/analytics'),
      '#offline': path.resolve(__dirname, './src/offline'),
      '#App.module.css': path.resolve(__dirname, './src/App.module.css'),
      '#sounds': path.resolve(__dirname, './public/sounds'),
      '#': path.resolve(__dirname, './src/'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/hook': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: path.join(path.resolve(__dirname), '..', 'cmd', 'client'),
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
    globals: true,
  },
})
