// import { line } from "./grammar";
import { compile } from "./ctx";
import { parseTokens } from "./tokenizer";

const parse = compile(line);

export function processLine(tokens: string[]): string {
  const parsed = parse(tokens.slice());
  if (parsed.error) {
    throw new Error(JSON.stringify(parsed, null, 2));
  } else {
    const s = parsed.results
      .map((r) => (typeof r === "string" ? r : tokens[r]))
      .join("");
    return s;
  }
}

export function transform(input: string) {
  let tokens: string[] = [];
  let results: string[] = [];
  for (const t of parseTokens(input)) {
    if (t === "\n") {
      results.push(processLine(tokens.slice()));
      tokens = [];
    } else {
      tokens.push(t);
    }
  }
  if (tokens.length > 0) {
    results.push(processLine(tokens));
  }
  // console.timeEnd("preprocess");
  return results.join("");
}
