import { defineConfig } from "vite";

export default defineConfig({
  define: process.env.LIB
    ? {
        "import.meta.vitest": false,
        "process.env.NODE_ENV": JSON.stringify("production"),
      }
    : {},
  build: {
    target: "esnext",
    // @ts-ignore
    lib: process.env.LIB && {
      entry: "src/index",
      // formats: ["es", "cjs"],
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
  test: {
    includeSource: ["src/**/*.{js,ts}"],
  },
});
