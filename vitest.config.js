import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    // server/ has its own suite on node:test, run by `npm --prefix server test`.
    exclude: ["**/node_modules/**", "dist/**", "server/**"],
  },
});
