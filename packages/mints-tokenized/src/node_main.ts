// import { transform } from '@mizchi/mints';
import { Worker } from "worker_threads";
import { wrap } from "./rpc/node";
import { parseTokens } from "./runtime/tokenizer";
const MAX_TOKENS = 512;

export function createTransformer(workerPath: string, workers: number) {
  const apis = [...Array(workers).keys()].map((_i) => {
    return wrap(new Worker(workerPath));
  });
  return {
    terminate() {
      apis.forEach((w) => w.terminate());
    },
    transform: async (input: string, opts?: any) => {
      let i = 0;
      const promises: Promise<string>[] = [];
      let _tokens: string[] = [];
      let _tokensList: Array<string[]> = [];
      let _currentTokensCount = 0;

      const _hydrate = () => {
        promises.push(
          apis[i++ % apis.length].exec("transform", _tokensList, opts)
        );
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
