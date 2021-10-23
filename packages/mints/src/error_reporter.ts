import { ErrorType, NodeKind, ParseError } from "../../pargen/src/types";

export function reportError(input: string, error: ParseError) {
  const deepError = findMaxPosError(error, error);
  const sliced = input.slice(0, deepError.pos);
  const lines = sliced.split(/[\n;]/);
  const errorLine = lines[lines.length - 1];
  const errorLineStart = Array.from(lines.slice(0, -1).join("\n")).length;
  const errorLineNumber = lines.length;
  const errorColumn = deepError.pos - errorLineStart;
  const linePrefix = `L${errorLineNumber}:${errorColumn}\t`;
  const errorNextLine = input.slice(deepError.pos).split(/[\n;]/)[0];
  const errorSummary = `${deepError.pos}:${NodeKind[error.kind]}(${
    error.rootId
  }>${error.id}|${ErrorType[error.errorType]}`;
  const outputLine = `${linePrefix}${errorLine}${errorNextLine}`;
  const errorCursor =
    linePrefix + " ".repeat(deepError.pos - errorLineStart) + "^";
  console.log(`${errorSummary}}\n${outputLine}\n${errorCursor}`);
}

// TODO: Move to pargen code
function findMaxPosError(
  error: ParseError,
  currentError: ParseError
): ParseError {
  if (error.pos === currentError.pos) {
    if (error.errorType === ErrorType.Token_Unmatch) {
      currentError = error;
    }
  } else {
    currentError = error.pos > currentError.pos ? error : currentError;
  }

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
