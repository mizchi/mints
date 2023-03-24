import { defineConfig } from "vite";

export default defineConfig({
  // define: process.env.LIB
  //   ? {
  //       "import.meta.vitest": false,
  //       // "process.env.NODE_ENV": JSON.stringify("production"),
  //     }
  //   : {},
  // @ts-ignore
  test: {
    includeSource: ["src/**/*.{js,ts}"],
  },
});
