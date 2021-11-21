import type { RootParser } from "../../pargen-tokenized/src/types";
import { expose } from "./rpc/node";
import { parentPort } from "worker_threads";
import { funcs } from "./runtime/funcs";
import { createParserWithSnapshot } from "../../pargen-tokenized/src/index";
import { loadSnapshot } from "./runtime/load_snapshot";

let _parse: RootParser = createParserWithSnapshot(funcs, loadSnapshot());
function transformLine(tokens: string[], opts?: any): string {
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

async function transform(tokensList: string[][]) {
  return tokensList.map(transformLine);
}

expose(parentPort, { transform });
