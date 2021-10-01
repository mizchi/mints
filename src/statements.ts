import { createContext } from "./index";

import assert from "assert";

import type { Builder } from "./index";
import { defineLiteral } from "./literal";
import { _, __ } from "./constants";

//TODO: EOF
export function defineStatements($: Builder) {
  const L = defineLiteral($);
  const emptyStatement = $.def("emptyStatement", $.seq([_, ";", _]));
  return { emptyStatement };
}

// @ts-ignore
import { test, run } from "@mizchi/testio/dist/testio.cjs";
if (process.env.NODE_ENV === "test" && require.main === module) {
  const { compile, builder: $ } = createContext();

  // @ts-ignore
  const eq = (...args: any[]) => assert.deepStrictEqual(...(args as any));

  const Stmt = defineStatements($);

  test("empty", () => {
    const parseEmpty = compile(Stmt.emptyStatement);
    eq(parseEmpty(";").result, ";");
  });

  run({ stopOnFail: true, stub: true });
}
