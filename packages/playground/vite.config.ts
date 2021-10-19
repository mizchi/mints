import { defineConfig } from "vite";
export default defineConfig({
  define: {
    // "require.main": JSON.stringify(false),
    "require.main === module": JSON.stringify(false),
    // module: JSON.stringify(false),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    target: "esnext",
  },
});
