import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2019",
    lib: process.env.LIB && {
      entry: "src/index",
      formats: ["es"],
      fileName: () => `idb-ops.js`,
    },
  },
});
