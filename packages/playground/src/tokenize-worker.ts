// @ts-ignore
import ProcessWorker from "./process-worker?worker&inline";
import { expose, wrap } from "comlink";
// @ts-ignore
import { tokenizeBatch } from "../../mints-tokenized/dist/tokenizer.js";

type ProcessFunc = (tokens: string[][], opts: any) => Promise<string>;

const createProcessor = (workers: number) => {
  const apis = [...Array(workers).keys()].map((_) => {
    return wrap(new ProcessWorker());
  }) as Array<{ compile: ProcessFunc }>;
  console.log(`[mints] create ${workers} workers`);
  let i = 0;
  return async (tokens: string[][], opts: any): Promise<string> => {
    const api = apis[i++ % workers];
    return api.compile(tokens, opts);
  };
};

const process = createProcessor(8);

const api = {
  async transform(input: string): Promise<string> {
    try {
      const ret = tokenizeBatch(input, { jsx: "h" }, process);
      return await ret;
    } catch (err) {
      throw err;
    }
  },
};

export type TokenizerApi = typeof api;
expose(api);
