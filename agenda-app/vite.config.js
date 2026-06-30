import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Angel Meier · Agenda",
        short_name: "Agenda",
        description: "Gestión de turnos, clientes y disponibilidad",
        start_url: "/mano-a-mano-turnos/mano-a-mano-agenda/",
        scope: "/mano-a-mano-turnos/mano-a-mano-agenda/",
        display: "standalone",
        background_color: "#EFE9DF",
        theme_color: "#B5654A",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
    }),
  ],
  base: "/mano-a-mano-turnos/mano-a-mano-agenda/",
  resolve: {
    alias: {
      firebase: path.resolve(__dirname, "node_modules/firebase"),
      "lucide-react": path.resolve(__dirname, "node_modules/lucide-react"),
    },
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/firestore", "firebase/auth"],
  },
});
