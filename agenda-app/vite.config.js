import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/mano-a-mano-turnos/mano-a-mano-agenda/",
  resolve: {
    alias: {
      firebase: path.resolve(__dirname, "node_modules/firebase"),
    },
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/firestore", "firebase/auth"],
  },
});