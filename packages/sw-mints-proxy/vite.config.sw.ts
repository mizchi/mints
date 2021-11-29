import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "public",
    target: "esnext",
    lib: {
      entry: "src/sw.ts",
      formats: ["es"],
      fileName: (format) => {
        if (format === "es") {
          return `sw.js`;
        }
        return "";
      },
    },
  },
});
