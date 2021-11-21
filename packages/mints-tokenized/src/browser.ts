import type { Snapshot } from "../../pargen-tokenized/src/types";
import { funcs } from "./runtime/funcs";
import { createParserWithSnapshot } from "../../pargen-tokenized/src/index";
import { parseTokens } from "./runtime/tokenizer";
import { detectPragma } from "./runtime/preprocess";
import { decode } from "./runtime/decode_cbor_subset";
import {
  E_cidsList,
  E_entryRefId,
  E_flagsList,
  E_keyList,
  E_popList,
  E_refs,
  E_reshapeEachs,
  E_reshapes,
  E_rules,
  E_values,
} from "../../pargen-tokenized/src/constants";
import strings from "./runtime/strings.json";

export type Opts = {
  jsx?: string;
  jsxFragment?: string;
};

export function createTransform(binary: ArrayBuffer) {
  // build runtime
  const decoded = decode(binary);
  const d = Object.fromEntries;
  const snapshot = [
    decoded[E_entryRefId],
    decoded[E_rules],
    decoded[E_values],
    decoded[E_refs],
    decoded[E_cidsList],
    d(decoded[E_reshapes]),
    d(decoded[E_reshapeEachs]),
    d(decoded[E_flagsList]),
    d(decoded[E_keyList]),
    d(decoded[E_popList]),
    strings,
  ] as Snapshot;
  const parse = createParserWithSnapshot(funcs, snapshot);

  return (input: string, opts?: Opts) => {
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
  };
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
}
