import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    target: "esnext",
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
