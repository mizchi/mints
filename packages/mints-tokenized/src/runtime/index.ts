import type { Snapshot } from "../../../pargen-tokenized/src/types";
import { funcs } from "./funcs";
import { createParserWithSnapshot } from "../../../pargen-tokenized/src/index";
import { parseTokens } from "./tokenizer";
import { loadSnapshot } from "./load_snapshot";

const snapshot = loadSnapshot();
const parse = createParserWithSnapshot(funcs, snapshot as Snapshot);

export function processLine(tokens: string[]): string {
  const parsed = parse(tokens.slice());
  if (parsed.error) {
    throw new Error(JSON.stringify(parsed, null, 2));
  } else {
    const s = parsed.xs
      .map((r) => (typeof r === "string" ? r : tokens[r]))
      .join("");
    return s;
  }
}

export function transform(input: string) {
  let tokens: string[] = [];
  let results: string[] = [];
  for (const t of parseTokens(input)) {
    if (t === "\n") {
      results.push(processLine(tokens.slice()));
      tokens = [];
    } else {
      tokens.push(t);
    }
  }
  if (tokens.length > 0) {
    results.push(processLine(tokens));
  }
  return results.join("");
}
