import esbuild from "rollup-plugin-esbuild";
import { terser } from "rollup-plugin-terser";
import replace from "@rollup/plugin-replace";
import nodeResolve from "@rollup/plugin-node-resolve";

export default {
  input: ["src/index.ts"],
  // input: ["src/index_prebuild.ts"],
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
    terser({
      module: true,
      // compress: { drop_console: true },
      compress: {
        passes: 3,
        pure_funcs: [],
        // evaluate: false,
        hoist_props: true,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_undefined: true,
        inline: 3,
        // unsafe_math: true,
        unsafe: true,
      },
    }),
  ],
};
