import { Rule, RootCompilerOptions } from "./../../pargen/src/types";
import { createContext } from "../../pargen/src/index";
import { preprocessLight } from "./preprocess";

const { compile } = createContext({});

const compileWithPreprocess = (
  input: Rule | number,
  opts: RootCompilerOptions = {}
) => {
  const parser = compile(input, opts);
  const wrappedParser = (input: string, pos: number = 0) => {
    const pre = preprocessLight(input);
    const parseResult = parser(pre, pos);
    return parseResult;
  };
  return wrappedParser;
};

export { compileWithPreprocess as compile };
