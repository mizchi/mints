import { ErrorType, ParseError } from "@mizchi/pargen/src/types";
import { preprocessLight } from "./preprocess";

// let maxPos = 0;

export function formatError(input: string, error: ParseError) {
  const deepError = findMaxPosError(error, error);
  console.log("max depth", deepError.pos);
  _formatError(input, deepError);
}

export function findMaxPosError(
  error: ParseError,
  currentError: ParseError,
  stack: string[] = []
): ParseError {
  currentError = error.pos > currentError.pos ? error : currentError;

  if (error.errorType === ErrorType.Seq_Stop) {
    currentError = findMaxPosError(error.detail.child, currentError);
  }

  if (error.errorType === ErrorType.Or_UnmatchAll) {
    for (const e of error.detail.children) {
      currentError = findMaxPosError(e, currentError);
    }
  }
  return currentError;
}

export function _formatError(
  input: string,
  error: ParseError,
  depth: number = 0
) {
  if (depth === 0) {
    console.error("[parse:fail]", error.pos);
  }
  const prefix = " ".repeat(depth * 2);
  console.log(
    prefix,
    `${ErrorType?.[error.errorType]}[${error.pos}]`,
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
    _formatError(input, error.detail.child, depth + 1);
  }

  if (error.errorType === ErrorType.Or_UnmatchAll) {
    for (const e of error.detail.children) {
      _formatError(input, e, depth + 1);
    }
  }
}

export const expectSame = (parse: any, inputs: string[]) => {
  inputs.forEach((raw) => {
    const input = preprocessLight(raw);
    const result = parse(input);
    if (result.error) {
      formatError(input, result);
      // throw "Unexpected";
      throw new Error("Unexpected Result:" + input);
      // throw `Expect: ${input}\nOutput: ${result}`;
    } else if (!result.error && result.result !== input) {
      throw `Expect: ${input}\nOutput: ${JSON.stringify(result, null, 2)}`;
    }
  });
};

export const expectSuccess = (parse: any, raw: string) => {
  // inputs.forEach((raw) => {
  const input = preprocessLight(raw);
  const result = parse(input);
  if (result.error) {
    formatError(input, result);
    // throw "Unexpected";
    throw new Error("Unexpected Result:" + input);
    // throw `Expect: ${input}\nOutput: ${result}`;
  } else if (!result.error && result.result !== input) {
    throw `Expect: ${input}\nOutput: ${JSON.stringify(result, null, 2)}`;
  }
  // });
};

export const expectError = (parse: any, inputs: string[]) => {
  inputs.forEach((input) => {
    const result = parse(input);
    if (!result.error) {
      formatError(input, result);
      throw new Error("Unexpected Result:" + input);
    }
  });
};
