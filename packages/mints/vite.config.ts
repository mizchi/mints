import { defineConfig } from "vite";
export default defineConfig({
  define: {
    "require.main === module": JSON.stringify(false),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    target: "esnext",
    minify: "terser",
    // minify: true,
    // @ts-ignore
    lib: {
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
