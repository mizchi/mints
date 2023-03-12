import analyzer from "rollup-plugin-analyzer";
import config from "./rollup.config";

export default {
  ...config,
  output: {
    file: "dist/index.js",
    format: "es",
  },
  plugins: [...config.plugins, analyzer({ summaryOnly: true })],
};
