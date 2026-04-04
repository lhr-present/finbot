import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";


export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
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
  test: {
    environment: "node",
    globals: true,
  },
});
