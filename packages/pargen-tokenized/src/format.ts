import {
  ERROR_Token_Unmatch,
  ERROR_Regex_Unmatch,
  ParseError,
  ERROR_Or_UnmatchAll,
  ERROR_Seq_Stop,
  ERROR_Not_IncorrectMatch,
} from "./types";

export function formatError(
  tokens: string[],
  err: ParseError,
  depth: number = 0
): string {
  const prefix = "  ".repeat(depth) + `${err.pos}:`.padStart(3);

  if (err.errorType === ERROR_Not_IncorrectMatch) {
    // const formatted = formatError(tokens, err, depth + 1);
    return `${prefix}IncorrectMatch: ${JSON.stringify(
      err.matched.results,
      null,
      2
    )}`;
  }

  if (
    err.errorType === ERROR_Token_Unmatch ||
    err.errorType === ERROR_Regex_Unmatch
  ) {
    return `${prefix}Expect ${err.expect}, got ${err.got}`;
  }

  if (err.errorType === ERROR_Seq_Stop) {
    const formatted = formatError(tokens, err.childError, depth + 1);
    return `${prefix}Seq Stopped\n` + formatted;
  }

  if (err.errorType === ERROR_Or_UnmatchAll) {
    const formatted = err.errors
      .map((e) => "\n" + formatError(tokens, e, depth + 1))
      .join("");
    return `${prefix}UnmatchAll` + formatted;
  }

  return (
    `${prefix}TODO: formatError(${err.errorType})\n` +
    JSON.stringify(err, null, 2)
  );
}
