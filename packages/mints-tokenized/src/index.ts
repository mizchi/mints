import type { Snapshot } from "../../pargen-tokenized/src/types";
import { funcs } from "./runtime/funcs";
import { createParserWithSnapshot } from "../../pargen-tokenized/src/index";
import { parseTokens } from "./runtime/tokenizer";
import { loadSnapshot } from "./runtime/load_snapshot";

const snapshot = loadSnapshot();
const parse = createParserWithSnapshot(funcs, snapshot as Snapshot);

export type Opts = {
  jsx?: string;
  jsxFragment?: string;
};

export function transform(input: string, opts: Opts = {}) {
  let tokens: string[] = [];
  let results: string[] = [];
  for (const t of parseTokens(input)) {
    if (t === "\n") {
      results.push(processLine(tokens.slice(), opts));
      tokens = [];
    } else {
      tokens.push(t);
    }
  }
  if (tokens.length > 0) {
    results.push(processLine(tokens, opts));
  }
  return results.join("");
}

function processLine(tokens: string[], opts: Opts): string {
  const parsed = parse(tokens.slice(), opts);
  if (parsed.error) {
    throw new Error(JSON.stringify(parsed, null, 2));
  } else {
    const s = parsed.xs
      .map((r) => (typeof r === "string" ? r : tokens[r]))
      .join("");
    return s;
  }
}
