import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// User page served at the domain root → base "/".
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 4000, // Babylon is large; don't warn
  },
});
