import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";


export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "og-image.png"],
      manifest: {
        name: "FINBOT-9000",
        short_name: "FINBOT",
        description: "Financial decision simulator",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: { port: 3000, open: true },
  build: {
    rollupOptions: {
      output: {
        // Dynamic chunks (e.g. lazy Supabase SDK) go into assets/chunks/
        // so CI can check assets/index-*.js (main bundle) separately
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
      },
      plugins: [
        // Bundle treemap — only opens in browser during explicit analysis runs
        // Run: ANALYZE=true npm run build
        process.env.ANALYZE && visualizer({ open: true, filename: 'dist/bundle-stats.html', gzipSize: true }),
      ].filter(Boolean),
    },
  },
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/engine/**"],
      exclude: ["src/engine/sounds.js"],  // Web Audio — Node can't cover it meaningfully
    },
  },
});
