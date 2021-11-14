// import { transform } from '@mizchi/mints';
import { wrap } from "../rpc/node";
import { Worker } from "worker_threads";
import path from "path";
import fs from "fs";
import { parseTokens } from "../src/tokenizer";
import os from "os";

const MAX_TOKENS = 512;

export function createTransformer() {
  const MAX_CPUS = os.cpus().length - 1;
  const apis = [...Array(MAX_CPUS).keys()].map((_i) => {
    return wrap(new Worker(path.join(__dirname, "node_worker.js")));
  });
  return {
    terminate() {
      apis.forEach((w) => w.terminate());
    },
    transform: async (input: string) => {
      let i = 0;
      const promises: Promise<string>[] = [];

      let _tokens: string[] = [];
      let _tokensList: Array<string[]> = [];
      let _currentTokensCount = 0;

      const _hydrate = () => {
        promises.push(apis[i++ % apis.length].exec("transform", _tokensList));
        _tokensList = [];
        _currentTokensCount = 0;
      };
      const _enque = (tokens: string[], end = false) => {
        if (tokens.length + _currentTokensCount >= MAX_TOKENS) _hydrate();
        _currentTokensCount += tokens.length;
        _tokensList.push(tokens);
        if (_currentTokensCount >= MAX_TOKENS) _hydrate();
        if (end) _hydrate();
      };
      for (const t of parseTokens(input)) {
        if (t === "\n") {
          _enque(_tokens);
          _tokens = [];
        } else {
          _tokens.push(t);
        }
      }
      if (_tokens.length) _enque(_tokens, true);
      const results = await Promise.all(promises);
      return results.flat().join("");
    },
  };
}

if (require.main === module) {
  async function main() {
    const input = fs.readFileSync(
      path.join(__dirname, "../benchmark/cases/example4.ts"),
      "utf-8"
    );
    const transformer = await createTransformer();
    console.time("root");
    const _result = await transformer.transform(input);
    console.timeEnd("root");
    // console.log("size", result.length);
    console.log("result:", _result);
    transformer.terminate();
  }
  main();
  // main(code);
}
