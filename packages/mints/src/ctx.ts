import { Rule, RootCompilerOptions } from "./../../pargen/src/types";
import { createContext } from "../../pargen/src/index";
import { detectPragma, preprocessLight } from "./preprocess";

const { compile } = createContext({});

// TODO: Fix singleton

const defaultJsx = "React.createElement";
const defaultJsxFragment = "React.Fragment";

export let config = {
  jsx: defaultJsx,
  jsxFragment: defaultJsxFragment,
};

const compileWithPreprocess = (
  inputRule: Rule | number,
  opts: RootCompilerOptions = {}
) => {
  const parser = compile(inputRule, opts);
  const wrappedParser = (
    input: string,
    opts?: { jsx: string; jsxFragment: string }
  ) => {
    const pragma = detectPragma(input);
    const overrideJsx = pragma.jsx ?? opts?.jsx;
    if (overrideJsx) config.jsx = overrideJsx;
    const overrideJsxFragment = pragma.jsxFragment ?? opts?.jsxFragment;
    if (overrideJsxFragment) config.jsxFragment = overrideJsxFragment;

    console.log("override", config, pragma, input);

    const pre = preprocessLight(input);
    const parseResult = parser(pre, 0);

    // restore pragma
    config.jsx = defaultJsx;
    config.jsxFragment = defaultJsxFragment;
    return parseResult;
  };
  return wrappedParser;
};

export { compileWithPreprocess as compile };
