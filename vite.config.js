import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" assert { type: "json" };

// Determine base from package.json `homepage` (if present).
// For a GitHub project page use: "https://<user>.github.io/<repo>/"
// If no homepage is set, fall back to '/'.
const base = pkg.homepage ? new URL(pkg.homepage).pathname : "/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true, // Expone el servidor en la red local
  },
});
