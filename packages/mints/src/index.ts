import type { ParseSuccess, Snapshot } from "../../pargen-tokenized/src/types";
import { funcs } from "./runtime/funcs";
import { createParserWithSnapshot } from "../../pargen-tokenized/src/index";
import { parseTokens } from "./runtime/tokenizer";
import { loadSnapshot } from "./runtime/load_snapshot";
import { detectPragma } from "./runtime/preprocess";
import { Opts, TransformResult } from "./types";

const snapshot = loadSnapshot();
const parse = createParserWithSnapshot(funcs, snapshot as Snapshot);

export function transformSync(input: string, opts?: Opts): TransformResult {
  if (!opts) {
    opts = detectPragma(input);
    opts.jsx = opts.jsx ?? "React.createElement";
    opts.jsxFragment = opts.jsxFragment ?? "React.Fragment";
  }
  let tokens: string[] = [];
  let results: string[] = [];
  for (const t of parseTokens(input)) {
    if (t === "\n" && tokens.length > 0) {
      const result = process(tokens.slice(), opts);
      if (result.error) return result;
      results.push(result.code);
      tokens = [];
    } else {
      tokens.push(t);
    }
  }
  return {
    code: results.join(""),
  };
}

function process(tokens: string[], opts: Opts): TransformResult {
  const parsed = parse(tokens.slice(), opts);
  if (parsed.error) return parsed;
  return {
    code: parsed.xs
      .map((r) => (typeof r === "number" ? tokens[r] : r))
      .join(""),
  };
}
