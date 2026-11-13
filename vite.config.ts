import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon_io/favicon.ico",
        "favicon_io/favicon-16x16.png",
        "favicon_io/favicon-32x32.png",
        "favicon_io/apple-touch-icon.png",
      ],
      manifest: {
        name: "Support Connecté",
        short_name: "SC",
        description: "Support Connecté",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/espace-client",
        icons: [
          {
            src: "/favicon_io/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon_io/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/favicon_io/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
     workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
            {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
            },
            },
        ],
        },
      devOptions: { enabled: true },
    }),
  ],

});