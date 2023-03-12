import { defineConfig } from "vite";

export default defineConfig({
  // define: process.env.LIB
  //   ? {
  //       "import.meta.vitest": false,
  //       // "require.main": JSON.stringify(undefined),
  //       // "process.env.NODE_ENV": JSON.stringify("production"),
  //     }
  //   : {},
  // @ts-ignore
  test: {
    includeSource: ["src/**/*.{js,ts}"],
  },
});
