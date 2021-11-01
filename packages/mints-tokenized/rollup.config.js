import esbuild from "rollup-plugin-esbuild";
import { terser } from "rollup-plugin-terser";
import replace from "@rollup/plugin-replace";
import nodeResolve from "@rollup/plugin-node-resolve";

export default {
  input: ["src/index.ts"],
  output: [
    {
      file: "dist/index.js",
      format: "es",
    },
    {
      file: "dist/index.cjs",
      format: "cjs",
    },
  ],
  plugins: [
    nodeResolve(),
    replace({
      preventAssignment: true,
      "require.main === module": JSON.stringify(false),
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
    esbuild({
      target: "esnext",
    }),
    terser({ module: true }),
  ],
};
