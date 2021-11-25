import type { Snapshot } from "../../pargen-tokenized/src/types";
import { funcs } from "./runtime/funcs";
import { createParserWithSnapshot } from "../../pargen-tokenized/src/index";
import { parseTokens } from "./runtime/tokenizer";
import { loadSnapshot } from "./runtime/load_b64_snapshot";
import { detectPragma } from "./runtime/preprocess";
import { Opts } from "./types";

const snapshot = loadSnapshot();
const parse = createParserWithSnapshot(funcs, snapshot as Snapshot);

export function transformSync(input: string, opts?: Opts) {
  if (!opts) {
    opts = detectPragma(input);
    opts.jsx = opts.jsx ?? "React.createElement";
    opts.jsxFragment = opts.jsxFragment ?? "React.Fragment";
  }
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
