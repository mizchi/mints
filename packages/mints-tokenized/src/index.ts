import { program } from "./grammar";
import { compile } from "./ctx";

const parse = compile(program, { end: true });

export function transform(input: string) {
  return parse(input);
}

import { run, test } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const now = Date.now();

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
