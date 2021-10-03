// TODO: use symbol
import "./expression";

import { anyLiteral } from "./literal";
import { _, __, NodeTypes } from "./constants";
import { compile, builder as $ } from "./ctx";

//TODO: EOF
// export function defineStatements($: Builder) {
export const emptyStatement = $.def(
  NodeTypes.EmptyStatement,
  $.seq(["[\\s\\n;]*"])
);
export const debuggerStatement = $.def(
  NodeTypes.DebuggerStatement,
  $.seq(["debugger", _, ";"])
);

export const expressionStatement = $.def(
  NodeTypes.ExpressionStatement,
  $.seq([anyLiteral, ";"])
);

export const anyStatement = $.def(
  NodeTypes.AnyStatement,
  $.or([debuggerStatement, expressionStatement, emptyStatement])
);

const stmtLine = $.seq([_, anyStatement]);

export const program = $.def(
  NodeTypes.Program,
  $.seq([$.repeat($.seq([_, stmtLine, _])), $.eof()])
);

import { test, run, is } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  // const Stmt = defineStatements($);

  test("empty", () => {
    const parseEmpty = compile(emptyStatement);
    is(parseEmpty("").result, "");
    is(parseEmpty(";").result, ";");
    is(parseEmpty(";;;").result, ";;;");
    is(parseEmpty("\n").result, "\n");
    is(parseEmpty("\n\n").result, "\n\n");
  });
  test("debugger", () => {
    const parse = compile(debuggerStatement);
    is(parse("debugger;").result, "debugger;");
  });

  test("anyStatement", () => {
    const parseEmpty = compile(anyStatement);
    is(parseEmpty(";").result, ";");
    is(parseEmpty("debugger;").result, "debugger;");
    is(parseEmpty("1;").result, "1;");
  });

  test("program", () => {
    const parse = compile(program);
    is(parse(`debugger;`).result, "debugger;");
    is(
      parse(`debugger; debugger;   debugger   ;`).result,
      "debugger; debugger;   debugger   ;"
    );
    is(parse(`debugger; debugger;;`).result, "debugger; debugger;;");
  });
  run({ stopOnFail: true, stub: true, isMain });
}
