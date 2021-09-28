import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2019",
    lib: process.env.LIB && {
      entry: "src/index",
      formats: ["es", "cjs"],
      fileName: (format) => {
        if (format === "cjs") {
          return `index.cjs`;
        }
        if (format === "es") {
          return `index.js`;
        }
        return "";
      },
    },
  },
});
