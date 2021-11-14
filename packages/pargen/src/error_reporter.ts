import {
  Compiler,
  ERROR_Or_UnmatchAll,
  ERROR_Seq_Stop,
  ERROR_Token_Unmatch,
  ParseError,
} from "./types";

export function reportError(
  input: string,
  compiler: Compiler,
  error_: ParseError
) {
  const err = findDeepestError(error_, error_);
  const sliced = input.slice(0, err.pos);
  const lines = sliced.split(/[\n;]/);
  const errorLine = lines[lines.length - 1];
  const errorLineStart = Array.from(lines.slice(0, -1).join("\n")).length;
  const errorLineNumber = lines.length;
  const linePrefix = `L${errorLineNumber}: `;
  const errorNextLine = input.slice(err.pos).split(/[\n;]/)[0];
  // const errorSummary = `ParseError: ${err.code}[${err.rule.kind}] defId:${err.rootId} => nodeId:${err.rule.id}`;
  const errorSummary = `ParseError: ${err.code} defId:${err.rootId}`;
  const outputLine = `${linePrefix}${errorLine}${errorNextLine}`;
  const errorCursor =
    " ".repeat(linePrefix.length) + " ".repeat(err.pos - errorLineStart) + "^";
  console.log(`${errorSummary}}\n${outputLine}\n${errorCursor}`);
}

// TODO: Move to pargen code
function findDeepestError(
  error: ParseError,
  currentError: ParseError
): ParseError {
  if (error.pos === currentError.pos) {
    if (error.code === ERROR_Token_Unmatch) {
      currentError = error;
    }
  } else {
    currentError = error.pos > currentError.pos ? error : currentError;
  }

  if (error.code === ERROR_Seq_Stop) {
    currentError = findDeepestError(error.childError, currentError);
  }

  if (error.code === ERROR_Or_UnmatchAll) {
    for (const e of error.errors) {
      currentError = findDeepestError(e, currentError);
    }
  }
  return currentError;
}
