import type { RootParser } from "../../pargen-tokenized/src/types";
import { funcs } from "./runtime/funcs";
import { createParserWithSnapshot } from "../../pargen-tokenized/src/index";
import { loadSnapshot } from "./runtime/load_snapshot";
import { Opts } from "./types";

let _parse: RootParser = createParserWithSnapshot(funcs, loadSnapshot());
function process(tokens: string[], opts?: Opts): string {
  const parsed = _parse(tokens.slice(), opts);
  if (parsed.error) {
    throw new Error(JSON.stringify(parsed, null, 2));
  } else {
    const s = parsed.xs
      .map((r) => (typeof r === "string" ? r : tokens[r]))
      .join("");
    return s;
  }
}

export function processBatch(tokensList: string[][], opts: Opts = {}) {
  return tokensList.map((tokens) => process(tokens, opts));
}
