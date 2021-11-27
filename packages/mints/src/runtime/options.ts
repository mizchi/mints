import { Opts } from "../types";

const jsxRegex = /\/\*\s?@jsx\s+([a-zA-Z\.]+)\s*\*\//;
const jsxFragmentRegex = /\/\*\s?@jsxFrag\s+([a-zA-Z\.]+)\s*\*\//;

export function detectInlineOptions(input: string): Opts {
  return {
    jsx: jsxRegex.exec(input)?.[1],
    jsxFragment: jsxFragmentRegex.exec(input)?.[1],
  };
}
