// import type {
//   Rule,
//   RootCompilerOptions,
// } from "../../pargen-tokenized/src/types";
import { createContext } from "../../pargen-tokenized/src/index";
const { compile } = createContext({});

// TODO: Fix singleton

const defaultJsx = "React.createElement";
const defaultJsxFragment = "React.Fragment";

export let config = {
  jsx: defaultJsx,
  jsxFragment: defaultJsxFragment,
};

export { compile };
// const compileWithPreprocess = (
//   inputRule: Rule | number,
//   opts: RootCompilerOptions = {}
// ) => {
//   const parser = compile(inputRule, opts);
//   const wrappedParser = (
//     input: string,
//     opts?: { jsx: string; jsxFragment: string }
//   ) => {
//     // const pragma = detectPragma(input);
//     // const overrideJsx = pragma.jsx ?? opts?.jsx;
//     // if (overrideJsx) config.jsx = overrideJsx;
//     // const overrideJsxFragment = pragma.jsxFragment ?? opts?.jsxFragment;
//     // if (overrideJsxFragment) config.jsxFragment = overrideJsxFragment;
//     // config.jsx = defaultJsx;
//     // config.jsxFragment = defaultJsxFragment;
//     let tokens = [];
//     for (const next of parseTokens(input)) {
//       tokens.push(next);
//     }
//     return parser(tokens, 0);
//     // restore pragma
//     // return parseResult;
//   };
//   return wrappedParser;
// };

// export { compileWithPreprocess as compile };
