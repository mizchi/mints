import { createContext } from "./index";

import type { Builder } from "./index";
import { defineLiteral } from "./literal";
import { _, __ } from "./constants";

//TODO: EOF
export function defineStatements($: Builder) {
  const emptyStatement = $.def("emptyStatement", $.seq(["[\\s\\n;]*"]));
  const debuggerStatement = $.def(
    "debuggerStatement",
    $.seq(["debugger", _, ";"])
  );

  const expressionStatement = $.def(
    "expressionStatement",
    $.seq([$.ref("anyLiteral"), ";"])
  );

  const anyStatement = $.def(
    "statement",
    $.or([debuggerStatement, expressionStatement, emptyStatement])
  );

  const stmtLine = $.def("stmtLine", $.seq([_, anyStatement]));
  const program = $.def(
    "program",
    $.seq([$.repeat($.seq([_, stmtLine, _])), $.eof()])
  );
  return { emptyStatement, anyStatement, debuggerStatement, program, stmtLine };
}

// @ts-ignore
import { test, run } from "@mizchi/testio/dist/testio.cjs";
import assert from "assert";
if (process.env.NODE_ENV === "test" && require.main === module) {
  const { compile, builder: $ } = createContext();
  const L = defineLiteral($);

  // @ts-ignore
  const eq = (...args: any[]) => assert.deepStrictEqual(...(args as any));

  const Stmt = defineStatements($);

  test("empty", () => {
    const parseEmpty = compile(Stmt.emptyStatement);
    eq(parseEmpty("").result, "");
    eq(parseEmpty(";").result, ";");
    eq(parseEmpty(";;;").result, ";;;");
    eq(parseEmpty("\n").result, "\n");
    eq(parseEmpty("\n\n").result, "\n\n");
  });
  test("debugger", () => {
    const parse = compile(Stmt.debuggerStatement);
    eq(parse("debugger;").result, "debugger;");
  });

  test("anyStatement", () => {
    const parseEmpty = compile(Stmt.anyStatement);
    eq(parseEmpty(";").result, ";");
    eq(parseEmpty("debugger;").result, "debugger;");
    eq(parseEmpty("1;").result, "1;");
  });

  test("program", () => {
    const parse = compile(Stmt.program);
    eq(parse(`debugger;`).result, "debugger;");
    eq(
      parse(`debugger; debugger;   debugger   ;`).result,
      "debugger; debugger;   debugger   ;"
    );
    eq(parse(`debugger; debugger;;`).result, "debugger; debugger;;");

    // eq(parse(`\n`).result, "\n");
  });

  // test("program:repeat-stmt-line", () => {
  //   const parse = compile(Stmt.stmtLine);
  //   // console.log("--- debugger", parse(`debugger;`));
  //   eq(parse(`debugger;`).result, "debugger;");
  // });

  // test("program:repeat-stmts", () => {
  //   const parse = compile(Stmt.program);
  //   console.log("--- debugger", parse(`debugger;`));
  //   // eq(parse(`debugger;`).result, "debugger;");
  // });

  run({ stopOnFail: true, stub: true });
}
