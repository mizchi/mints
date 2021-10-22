import ts from "typescript";
import { ErrorType, ParseError } from "@mizchi/pargen/src/types";
import { preprocessLight } from "./preprocess";
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
  {
    format = true,
    stripTypes = true,
  }: { format?: boolean; stripTypes?: boolean }
) => {
};

// export const expectError = (parse: any, inputs: string[]) => {
//   inputs.forEach((input) => {
//     const result = parse(preprocessLight(input));
//     if (!result.error) {
//       throw new Error("Unexpected SameResult:" + result);
//     }
//   });
// };

// export function formatError(input: string, error: ParseError) {
//   const deepError = findMaxPosError(error, error);
//   console.log("max depth", deepError.pos);
//   _formatError(input, deepError);
// }

// export function findMaxPosError(
//   error: ParseError,
//   currentError: ParseError
// ): ParseError {
//   currentError = error.pos > currentError.pos ? error : currentError;

//   if (error.errorType === ErrorType.Seq_Stop) {
//     currentError = findMaxPosError(error.detail.child, currentError);
//   }

//   if (error.errorType === ErrorType.Or_UnmatchAll) {
//     for (const e of error.detail.children) {
//       currentError = findMaxPosError(e, currentError);
//     }
//   }
//   return currentError;
// }

// function _formatError(input: string, error: ParseError, depth: number = 0) {
//   if (depth === 0) {
//     console.error("[parse:fail]", error.pos);
//   }
//   const prefix = " ".repeat(depth * 2);
//   console.log(
//     prefix,
//     `${ErrorType?.[error.errorType]}[${error.pos}]`,
//     `<$>`,
//     input.substr(error.pos).split("\n")[0] + " ..."
//   );
//   if (error.errorType === ErrorType.Token_Unmatch && error.detail) {
//     console.log(prefix, ">", error.detail);
//   }
//   if (error.errorType === ErrorType.Not_IncorrectMatch) {
//     console.log(prefix, "matche", error);
//   }

//   if (error.errorType === ErrorType.Seq_Stop) {
//     _formatError(input, error.detail.child, depth + 1);
//   }

//   if (error.errorType === ErrorType.Or_UnmatchAll) {
//     for (const e of error.detail.children) {
//       _formatError(input, e, depth + 1);
//     }
//   }
// }
