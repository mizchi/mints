// import { transform } from '@mizchi/mints';
import { wrap } from "../rpc/node";
import { Worker } from "worker_threads";
import path from "path";
import fs from "fs";
import { parseTokens } from "../src/tokenizer";
import os from "os";

export function createTransformer() {
  // const worker = new Worker(path.join(__dirname, "node_worker.js"));

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
      let tokens: string[] = [];
      const promises: Promise<string>[] = [];
      for (const t of parseTokens(input)) {
        if (t === "\n") {
          promises.push(apis[i++ % apis.length].exec("transform", tokens));
          tokens = [];
        } else {
          tokens.push(t);
        }
      }
      if (tokens.length)
        promises.push(apis[i++ % apis.length].exec("transform", tokens));
      const results = await Promise.all(promises);
      return results.join("");
    },
  };
}

if (require.main) {
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
    // console.log("result", result);
    transformer.terminate();
  }
  main();
  // main(code);
}
