import {
  ParseSuccess,
  ParseError,
  Rule,
  RootCompilerOptions,
} from "./../../pargen/src/types";
import { reportError } from "../../pargen/src/error_reporter";
import { createContext } from "../../pargen/src/index";
import { preprocessLight } from "./preprocess";

const { builder, compiler, compile } = createContext({
  composeTokens: true,
});

// export const close = compiler.compile

type TransformResult =
  | ParseSuccess
  | (ParseError & {
      reportErrorDetail(): void;
    });

const compileWithPreprocess = (
  input: Rule | number,
  opts: RootCompilerOptions = {}
) => {
  const parser = compile(input, opts);
  const wrappedParser = (input: string, pos: number = 0): TransformResult => {
    const pre = preprocessLight(input);
    const parseResult = parser(pre, pos);
    if (parseResult.error) {
      return {
        ...parseResult,
        reportErrorDetail() {
          reportError(pre, parseResult, compiler.definitions);
          // WIP: Report error detail
          // console.log("expected", parseResult);
          // const errorRootId = parseResult.rootId;
          // const errorRuleId = parseResult.id;
          // const rule = compiler.defs[errorRootId];
          // console
          // console.log(compiler.defs, errorRootId);
        },
      };
    } else {
      return parseResult;
    }
  };
  return wrappedParser;
};

export { compileWithPreprocess as compile, builder };
