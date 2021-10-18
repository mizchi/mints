import { ErrorType, NodeKind, ParseError } from "../types";
import { is } from "@mizchi/test";

export function formatError(
  input: string,
  error: ParseError,
  depth: number = 0
) {
  console.log(
    "  ".repeat(depth),
    `[parse:fail] ${ErrorType[error.errorType]}(${NodeKind[error.kind]})[${
      error.pos
    }]`,
    `<$>`,
    input.substr(error.pos).split("\n")[0] + " ..."
  );
  if (error.errorType === ErrorType.Token_Unmatch && error.detail) {
    console.log(" ".repeat(depth), error.detail);
  }
  if (error.errorType === ErrorType.Seq_Stop) {
    formatError(input, error.detail.child, depth + 1);
  }
  if (error.errorType === ErrorType.Or_UnmatchAll) {
    for (const e of error.detail.children) {
      formatError(input, e, depth + 1);
    }
  }
}

export const expectSame = (parse: any, inputs: string[]) => {
  inputs.forEach((input) => {
    try {
      const result = parse(input);
      if (result.error) {
        throw result;
      }
    } catch (err) {
      formatError(input, err);
      throw `Expect: ${input}\nOutput: ${JSON.stringify(err, null, 2)}`;
    }
  });
};

export const assertError = (parse: any, inputs: string[]) => {
  inputs.forEach((input) => {
    try {
      const result = parse(input);
      if (result.error !== true) {
        throw result;
      }
    } catch (error) {
      throw `Unexpected ${JSON.stringify(error, null, 2)}`;
    }
  });
};
