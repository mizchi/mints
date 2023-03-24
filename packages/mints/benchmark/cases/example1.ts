import ts from "typescript";
import { ErrorType, ParseError } from "../../../pargen/src/types";
import { preprocessLight } from "../../src/preprocess";
import prettier from "prettier";

function compileTsc(input: string) {
  return ts.transpile(input, {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.Latest,
  });
}

const _format = (input: string, format: boolean, stripTypes: boolean) => {
  input = stripTypes ? compileTsc(input) : input;
  return format ? prettier.format(input, { parser: "typescript" }) : input;
};

export const expectSame = (
  parse: any,
  inputs: string[],
  // {
  //   format = true,
  //   stripTypes = true,
  // }: { format?: boolean; stripTypes?: boolean } = {}
) => {
  inputs.forEach((raw) => {
    const input = preprocessLight(raw);
    const result = parse(input);
    if (result.error) {
      formatError(input, result);
      throw new Error("Unexpected Result:" + input);
    } else {
      const resultf = format
        ? _format(result.result as string, format, stripTypes)
        : result.result;
      const expectedf = format ? _format(input, format, stripTypes) : input;
      if (resultf !== expectedf) {
        throw `Expect: ${input}\nOutput: ${JSON.stringify(result, null, 2)}`;
      }
    }
  });
};

export const expectError = (parse: any, inputs: string[]) => {
  inputs.forEach((input) => {
    const result = parse(preprocessLight(input));
    if (!result.error) {
      throw new Error("Unexpected SameResult:" + result);
    }
  });
};

export function formatError(input: string, error: ParseError) {
  const deepError = findMaxPosError(error, error);
  console.log("max depth", deepError.pos);
  _formatError(input, deepError);
}

export function findMaxPosError(
  error: ParseError,
  currentError: ParseError,
): ParseError {
  currentError = error.pos > currentError.pos ? error : currentError;

  if (error.code === ErrorType.Seq_Stop) {
    currentError = findMaxPosError(error.detail.child, currentError);
  }

  if (error.code === ErrorType.Or_UnmatchAll) {
    for (const e of error.detail.children) {
      currentError = findMaxPosError(e, currentError);
    }
  }
  return currentError;
}

function _formatError(input: string, error: ParseError, depth: number = 0) {
  if (depth === 0) {
    console.error("[parse:fail]", error.pos);
  }
  const prefix = " ".repeat(depth * 2);
  console.log(
    prefix,
    `${ErrorType?.[error.code]}[${error.pos}]`,
    `<$>`,
    input.substr(error.pos).split("\n")[0] + " ...",
  );
  if (error.code === ErrorType.Token_Unmatch && error.detail) {
    console.log(prefix, ">", error.detail);
  }
  if (error.code === ErrorType.Not_IncorrectMatch) {
    console.log(prefix, "matche", error);
  }
  if (error.code === ErrorType.Seq_Stop) {
    _formatError(input, error.detail.child, depth + 1);
  }
  if (error.code === ErrorType.Or_UnmatchAll) {
    for (const e of error.detail.children) {
      _formatError(input, e, depth + 1);
    }
  }
}
