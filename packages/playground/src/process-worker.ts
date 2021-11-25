import { expose } from "comlink";
import { processBatch } from "@mizchi/mints/src/processor";
import { Opts } from "@mizchi/mints/src/types";

const api = {
  async compile(input: string[][], opts: Opts) {
    return processBatch(input, opts);
  },
};

export type ProcessApi = typeof api;
expose(api);
