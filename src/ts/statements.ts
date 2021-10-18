// TODO: use symbol
import "./expression";

import { anyExpression } from "./expression";
import { _, __, NodeTypes as T } from "./constants";
import { compile, builder as $ } from "./ctx";

const emptyStatement = $.def(T.EmptyStatement, $.seq(["[\\s\\n;]*"]));
const breakStatement = $.def(T.BreakStatement, $.tok("break"));
const debuggerStatement = $.def(T.DebuggerStatement, $.tok("debugger"));

const returnStatement = $.def(
  T.ReturnStatement,
  $.seq(["return", $.opt($.seq([__, T.AnyExpression]))])
);
const throwStatement = $.def(
  T.ThrowStatement,
  $.seq(["throw", __, T.AnyExpression])
);

const blockOrStatement = $.or([T.Block, T.AnyStatement]);
export const ifStatement = $.def(
  T.IfStatement,
  $.or([
    $.seq([
      // if
      "if",
      _,
      "\\(",
      _,
      T.AnyExpression,
      _,
      "\\)",
      _,
      blockOrStatement,
      _,
      $.opt($.seq(["else", __, blockOrStatement])),
    ]),
  ])
);

export const assignStatement = $.def(
  T.AssignStatement,
  $.or([
    $.seq([
      // for(start;continuous;end)
      "(var|const|let)",
      __,
      T.Identifier,
      _,
      "=",
      _,
      T.AnyExpression,
    ]),
  ])
);

export const forStatement = $.def(
  T.ForStatement,
  $.or([
    $.seq([
      // for(start;continuous;end)
      "for",
      _,
      "\\(",
      _,
      // step start
      // TODO: assignStatement;
      T.AnyExpression,
      _,
      "\\;",
      // continuous
      _,
      T.AnyExpression,
      _,
      "\\;",
      // step end
      T.AnyExpression,
      "\\)",
      _,
      blockOrStatement,
    ]),
  ])
);

export const whileStatement = $.def(
  T.WhileStatement,
  $.or([
    $.seq([
      // if
      "while",
      _,
      "\\(",
      _,
      T.AnyExpression,
      _,
      "\\)",
      _,
      blockOrStatement,
    ]),
  ])
);

export const expressionStatement = $.def(
  T.ExpressionStatement,
  $.seq([anyExpression, $.repeat_seq([",", _, anyExpression])])
);

export const anyStatement = $.def(
  T.AnyStatement,
  $.or([
    debuggerStatement,
    breakStatement,
    returnStatement,
    ifStatement,
    whileStatement,
    expressionStatement,
    emptyStatement,
  ])
);

const statementLine = $.or([
  $.seq([_, anyStatement, _, "(\\;\\n?|\\n)"]),
  $.seq([_, ";"]),
]);

export const block = $.def(
  T.Block,
  $.seq(["{", _, $.repeat(statementLine), _, "}"])
);

export const program = $.def(
  T.Program,
  $.seq([$.repeat(statementLine), $.eof()])
);

import { test, run, is } from "@mizchi/test";
import { assertError, expectSame } from "./_testHelpers";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
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
    is(parse("debugger").result, "debugger");
  });
  test("return", () => {
    const parse = compile(returnStatement);
    expectSame(parse, ["return", "return 1"]);
  });
  test("throw", () => {
    const parse = compile(throwStatement);
    expectSame(parse, ["throw 1"]);
    assertError(parse, ["throw"]);
  });
  test("block", () => {
    const parse = compile($.seq([block, $.eof()]));
    expectSame(parse, [`{ return 1; }`, `{ debugger; return; }`, "{}"]);
  });

  test("while", () => {
    const parse = compile($.seq([whileStatement, $.eof()]));
    expectSame(parse, ["while(1) 1", "while(1) { break; }"]);
  });

  test("if", () => {
    const parse = compile($.seq([ifStatement, $.eof()]));
    expectSame(parse, [
      "if(1) 1",
      `if(1) { return 1; }`,
      `if(1) 1 else 2`,
      `if (1) 1 else if (1) return`,
      `if (1) 1 else if (1) return else 1`,
      `if (1) { if(2) return; }`,
    ]);
  });

  test("expressionStatement", () => {
    const parse = compile(expressionStatement);
    expectSame(parse, ["1", "func()", "a = 1", "a.b = 1", "1, 1"]);
  });

  test("anyStatement", () => {
    const parseEmpty = compile(anyStatement);
    is(parseEmpty(" ").result, " ");
  });

  test("program:multiline", () => {
    const parse = compile(program);
    is(parse(`debugger;`).result, "debugger;");
    is(
      parse(`debugger; debugger;   debugger   ;`).result,
      "debugger; debugger;   debugger   ;"
    );
    is(parse(`debugger; debugger;1;;`).result, "debugger; debugger;1;;");
  });
  run({ stopOnFail: true, stub: true, isMain });
}
