import { defineConfig } from "vite";
export default defineConfig({
  define: {
    "require.main === module": JSON.stringify(false),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    target: "esnext",
  },
});
