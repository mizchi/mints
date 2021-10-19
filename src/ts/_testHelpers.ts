import { ErrorType, NodeKind, ParseError } from "../types";

export function formatError(
  input: string,
  error: ParseError,
  depth: number = 0
) {
  if (depth === 0) {
    console.error("[parse:fail]");
  }
  const prefix = " ".repeat(depth * 2);
  console.log(
    prefix,
    `${ErrorType[error.errorType]}[${error.pos}]`,
    `<$>`,
    input.substr(error.pos).split("\n")[0] + " ..."
  );
  if (error.errorType === ErrorType.Token_Unmatch && error.detail) {
    console.log(prefix, ">", error.detail);
  }
  if (error.errorType === ErrorType.Not_IncorrectMatch) {
    console.log(prefix, "matche", error);
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
    const result = parse(input);
    if (result.error) {
      formatError(input, result);
      throw "Unexpected";
      // throw `Expect: ${input}\nOutput: ${result}`;
    } else if (!result.error && result.result !== input) {
      throw `Expect: ${input}\nOutput: ${JSON.stringify(result, null, 2)}`;
    }
  });
};

export const expectError = (parse: any, inputs: string[]) => {
  inputs.forEach((input) => {
    const result = parse(input);
    if (!result.error) {
      formatError(input, result);
      throw "Unexpected";
    }
  });
};
