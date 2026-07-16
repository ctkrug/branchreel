import { defineConfig } from "vite";

// Relative base + a single dist/ output so this demo can be hosted at any
// subpath (e.g. apps.charliekrug.com/branchreel) with no path rewriting.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
});
