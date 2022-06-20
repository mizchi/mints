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
  const detail = err.detail;
  if (detail[0] === CODE_NOT_INCORRECT_MATCH) {
    return `${prefix}IncorrectMatch: ${JSON.stringify(detail[1].xs, null, 2)}`;
  }

  if (detail[0] === CODE_TOKEN_UNMATCH || detail[0] === CODE_REGEX_UNMATCH) {
    return `${prefix}Expect ${detail[1]}, got ${detail[2]}`;
  }

  if (detail[0] === CODE_SEQ_STOP) {
    const formatted = formatError(tokens, detail[2], depth + 1);
    return `${prefix}Seq Stopped\n` + formatted;
  }

  if (detail[0] === CODE_OR_UNMATCH_ALL) {
    const formatted = detail[1]
      .map((e) => "\n" + formatError(tokens, e, depth + 1))
      .join("");
    return `${prefix}UnmatchAll` + formatted;
  }

  return (
    `${prefix}TODO: formatError(${detail[0]})\n` + JSON.stringify(err, null, 2)
  );
}
