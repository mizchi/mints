import { program } from "./grammar";

import { compile } from "./ctx";

const parse = compile(program, { end: true });

export function transform(input: string) {
  return parse(input);
}

import { run } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const now = Date.now();
  run({ stopOnFail: true, stub: true, isMain }).then(() => {
    console.log("[test:time]", Date.now() - now);
  });
}
