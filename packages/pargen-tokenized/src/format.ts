import type { ParseError } from "./types";

import {
  CODE_NOT_INCORRECT_MATCH,
  CODE_OR_UNMATCH_ALL,
  CODE_REGEX_UNMATCH,
  CODE_SEQ_STOP,
  CODE_TOKEN_UNMATCH,
} from "./constants";

export function formatError(
  tokens: string[],
  err: ParseError,
  depth: number = 0
): string {
  const prefix = "  ".repeat(depth) + `${err.pos}:`.padStart(3);

  if (err.code === CODE_NOT_INCORRECT_MATCH) {
    // const formatted = formatError(tokens, err, depth + 1);
    return `${prefix}IncorrectMatch: ${JSON.stringify(
      err.matched.results,
      null,
      2
    )}`;
  }

  if (err.code === CODE_TOKEN_UNMATCH || err.code === CODE_REGEX_UNMATCH) {
    return `${prefix}Expect ${err.expect}, got ${err.got}`;
  }

  if (err.code === CODE_SEQ_STOP) {
    const formatted = formatError(tokens, err.childError, depth + 1);
    return `${prefix}Seq Stopped\n` + formatted;
  }

  if (err.code === CODE_OR_UNMATCH_ALL) {
    const formatted = err.errors
      .map((e) => "\n" + formatError(tokens, e, depth + 1))
      .join("");
    return `${prefix}UnmatchAll` + formatted;
  }

  return (
    `${prefix}TODO: formatError(${err.code})\n` + JSON.stringify(err, null, 2)
  );
}
