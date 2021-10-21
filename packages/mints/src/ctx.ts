import { RootCompiler, RootParser } from "@mizchi/pargen/src/types";
import { createContext } from "@mizchi/pargen/src";
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
