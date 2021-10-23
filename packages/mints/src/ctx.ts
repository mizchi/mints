import { RootCompiler, RootParser } from "../../pargen/src/types";
import { createContext } from "../../pargen/src/index";
import { preprocessLight } from "./preprocess";
const { compile, builder } = createContext<number>({
  composeTokens: true,
  // pairs: ["{", "}"],
});

const compileWithPreprocess: RootCompiler = (input, opts) => {
  const parser = compile(input, opts);
  const newParser: RootParser = (input, ctx) => {
    const pre = preprocessLight(input);
    const ret = parser(pre, ctx);
    return ret;
  };
  return newParser;
};

export { compileWithPreprocess as compile, builder };

interface X {}
