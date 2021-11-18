const jsxRegex = /\/\*\s?@jsx\s+([a-zA-Z\.]+)\s*\*\//;
const jsxFragmentRegex = /\/\*\s?@jsxFragment\s+([a-zA-Z\.]+)\s*\*\//;

export function detectPragma(input: string): {
  jsx: string | undefined;
  jsxFragment: string | undefined;
} {
  let jsx = undefined,
    jsxFragment = undefined;
  const jsxMatch = jsxRegex.exec(input);
  if (jsxMatch) {
    jsx = jsxMatch[1];
  }

  const jsxFragmentMatch = jsxFragmentRegex.exec(input);

  if (jsxFragmentMatch) {
    jsxFragment = jsxFragmentMatch[1];
  }
  return { jsx, jsxFragment };
}
