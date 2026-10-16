import { rename } from "node:fs/promises";
import path from "node:path";
import { defineConfig, mergeConfig } from "vite";
import mainConfig from "./vite.config";

export default defineConfig((env) => mergeConfig(mainConfig(env), {
  publicDir: false,
  build: {
    outDir: "dist-public",
    emptyOutDir: true,
    assetsDir: "assets-public",
    rollupOptions: {
      input: path.resolve(__dirname, "public.html"),
    },
  },
  // No public/ copy: it holds CNAME and staging files, and favicon.png is the same
  // file the staff app already serves at that path.
  plugins: [{
    name: "public-output",
    async closeBundle() {
      const outDir = path.resolve(__dirname, "dist-public");
      await rename(path.join(outDir, "public.html"), path.join(outDir, "index.html"));
    },
  }],
}));
