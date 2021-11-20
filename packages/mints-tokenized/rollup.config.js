import esbuild from "rollup-plugin-esbuild";
import { terser } from "rollup-plugin-terser";
import replace from "@rollup/plugin-replace";
import nodeResolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
// import type {RollupOptions} from "rollup";

const plugins = [
  json(),
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
];

export default ["index", "node_main", "node_worker"].map((name) => {
  return {
    input: `src/${name}.ts`,
    output: [
      {
        file: `dist/${name}.js`,
        format: "es",
      },
      {
        file: `dist/${name}.cjs`,
        format: "cjs",
      },
    ],
    plugins: plugins,
  };
});
