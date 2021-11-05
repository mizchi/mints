import { program, anyStatement } from "./grammar";
import { compile } from "./ctx";
import { parseTokens } from "./tokenizer";

const parse = compile(anyStatement);

function processLine(tokens: string[]): string {
  const parsed = parse(tokens.slice());
  if (parsed.error) {
    throw new Error(JSON.stringify(parsed));
  } else {
    const s = parsed.results
      .map((r) => (typeof r === "string" ? r : tokens[r]))
      .join("");
    return s;
    // return s.endsWith("}") ? s : s + ";";
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
  return results.join(";");
}

import { run, test, is } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const now = Date.now();
  test("multiline", () => {
    is(transform(`1;`), "1");
    is(transform(`debugger;debugger;`), "debugger;debugger");
    is(transform("class{};1"), "class{};1");
    is(transform(`function f(){};1;2;`), "function f(){};1;2");
    is(transform(`x=class{};function f(){}`), "x=class{};function f(){}");
    is(
      transform(`class{
  a = 1;
  b = 2;
  c = 3;
}`),
      "class{a=1;b=2;c=3;}"
    );
  });
  // test("jsx: no-pragma", () => {
  //   const code = `const el = <div>1</div>`;
  //   const result = transform(code);
  //   is(result, {
  //     result: `const el=React.createElement("div",{},"1")`,
  //   });
  // });

  // test("jsx pragma", () => {
  //   const code = `/* @jsx h */\nconst el = <div></div>`;
  //   const result = transform(code);
  //   // console.log("config", config);
  //   // console.log(result);
  //   is(result, {
  //     result: `const el=h("div",{})`,
  //   });
  // });

  run({ stopOnFail: true, stub: true, isMain }).then(() => {
    console.log("[test:time]", Date.now() - now);
  });
}
