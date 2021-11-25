import type { Opts } from "./types";
import { parseTokens } from "./runtime/tokenizer";
import { detectPragma } from "./runtime/preprocess";

const MAX_TOKENS = 512;

export async function tokenizeBatch(
  input: string,
  opts: Opts & { maxTokens?: number },
  process: (tokens: string[][], opts: Opts) => Promise<string>
) {
  if (!opts) {
    opts = detectPragma(input);
    opts.jsx = opts.jsx ?? "React.createElement";
    opts.jsxFragment = opts.jsxFragment ?? "React.Fragment";
  }
  const maxTokens = opts.maxTokens ?? MAX_TOKENS;
  const promises: Promise<string>[] = [];
  let _tokens: string[] = [];
  let _tokensList: string[][] = [];
  let _currentTokensCount = 0;
  const _hydrate = () => {
    promises.push(process(_tokensList, opts));
    _tokensList = [];
    _currentTokensCount = 0;
  };
  const _enque = (tokens: string[], end = false) => {
    if (tokens.length + _currentTokensCount >= maxTokens) _hydrate();
    _currentTokensCount += tokens.length;
    if (tokens.length > 0) _tokensList.push(tokens);
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
  _enque(_tokens, true);
  const results = await Promise.all(promises);
  return results.flat().join("");
}
