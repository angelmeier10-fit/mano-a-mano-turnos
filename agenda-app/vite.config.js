import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/mano-a-mano-turnos/mano-a-mano-agenda/",
});