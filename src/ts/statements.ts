// TODO: use symbol
import "./expression";

import { anyExpression } from "./expression";
import { _, __, NodeTypes as T } from "./constants";
import { compile, builder as $ } from "./ctx";

const emptyStatement = $.def(T.EmptyStatement, $.seq(["[\\s\\n;]*"]));
const breakStatement = $.def(T.BreakStatement, "break");
const debuggerStatement = $.def(T.DebuggerStatement, "debugger");

const returnStatement = $.def(
  T.ReturnStatement,
  $.seq(["(return|yield)", $.opt($.seq([__, T.AnyExpression]))])
);
const throwStatement = $.def(
  T.ThrowStatement,
  $.seq(["throw", __, T.AnyExpression])
);

const blockOrStatement = $.or([T.Block, T.AnyStatement]);
const blockOrNonEmptyStatement = $.or([T.Block, T.NonEmptyStatement]);

const blockStatement = $.def(T.BlockStatement, T.Block);

const ifStatement = $.def(
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
      blockOrNonEmptyStatement,
      _,
      $.opt($.seq(["else", __, blockOrStatement])),
    ]),
  ])
);

const switchStatement = $.def(
  T.SwitchStatement,
  $.or([
    $.seq([
      // switch() { case 1: break; }
      "switch",
      _,
      "\\(",
      _,
      T.AnyExpression,
      _,
      "\\)",
      _,
      "\\{",
      _,
      $.repeat_seq([
        "case",
        __,
        T.AnyExpression,
        _,
        "\\:",
        _,
        // include empty statement
        blockOrNonEmptyStatement,
        _,
      ]),
      _,
      $.opt($.seq(["default", _, "\\:", _, blockOrStatement])),
      _,
      "\\}",
    ]),
  ])
);

const __assignSeq = $.seq(["=", _, T.AnyExpression]);
export const variableStatement = $.def(
  T.VariableStatement,
  $.or([
    $.seq([
      // single
      "(var|const|let)",
      __,
      // x, y=1,
      $.repeat_seq([T.DestructivePattern, _, $.opt(__assignSeq), _, ",", _]),
      _,
      T.DestructivePattern,
      _,
      $.opt(__assignSeq),
    ]),
  ])
);

export const forStatement = $.def(
  T.ForStatement,
  $.seq([
    "for",
    _,
    "\\(",
    _,
    // start
    $.or([variableStatement, T.AnyExpression, _]),
    _,
    "\\;",
    // condition
    _,
    $.opt(T.AnyExpression),
    _,
    "\\;",
    // step end
    $.opt(T.AnyExpression),
    "\\)",
    _,
    blockOrNonEmptyStatement,
  ])
);

// include for in / for of
const forItemStatement = $.def(
  T.ForItemStatement,
  $.seq([
    "for",
    _,
    "\\(",
    _,
    "(var|const|let)",
    __,
    T.DestructivePattern,
    __,
    "(of|in)",
    __,
    T.AnyExpression,
    _,
    "\\)",
    _,
    blockOrNonEmptyStatement,
  ])
);

export const whileStatement = $.def(
  T.WhileStatement,
  $.or([
    $.seq([
      "while",
      _,
      "\\(",
      _,
      T.AnyExpression,
      _,
      "\\)",
      _,
      blockOrNonEmptyStatement,
    ]),
  ])
);

const doWhileStatement = $.def(
  T.DoWhileStatement,
  $.or([
    $.seq([
      "do",
      _,
      blockOrStatement,
      _,
      "while",
      _,
      "\\(",
      _,
      T.AnyExpression,
      _,
      "\\)",
    ]),
  ])
);

const expressionStatement = $.def(
  T.ExpressionStatement,
  $.seq([anyExpression, $.repeat_seq([",", _, anyExpression])])
);

const nonEmptyStatement = $.def(
  T.NonEmptyStatement,
  $.or([
    debuggerStatement,
    breakStatement,
    returnStatement,
    variableStatement,
    ifStatement,
    forItemStatement,
    forStatement,
    doWhileStatement,
    whileStatement,
    switchStatement,
    blockStatement,
    expressionStatement,
  ])
);

export const anyStatement = $.def(
  T.AnyStatement,
  $.or([nonEmptyStatement, emptyStatement])
);

const statementLine = $.or([
  $.seq([_, anyStatement, _, "(\\;\\n?|\\n)"]),
  $.seq([_, ";", _]),
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
import { expectError, expectSame } from "./_testHelpers";
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
    expectError(parse, ["throw"]);
  });
  test("block", () => {
    const parse = compile($.seq([block, $.eof()]));
    expectSame(parse, [`{ return 1; }`, `{ debugger; return; }`, "{}"]);
  });
  test("assign", () => {
    const parse = compile(variableStatement, { end: true });
    expectSame(parse, ["let x = 1", "let x,y"]);
  });

  test("for", () => {
    const parse = compile(forStatement, { end: true });
    expectSame(parse, [
      "for(x=0;x<1;x++) x",
      "for(x=0;x<1;x++) {}",
      "for(;;) x",
      "for(let x = 1;x<6;x++) x",
      "for(let x = 1;x<6;x++) {}",
      "for(;;) {}",
      "for(;x;x) {}",
    ]);
    expectError(parse, ["for(;;)"]);
  });

  test("for-item", () => {
    const parse = compile(forItemStatement, { end: true });
    expectSame(parse, [
      "for(const i of array) x",
      "for(const k in array) x",
      "for(let {} in array) x",
      "for(let {} in []) x",
      "for(let [] in xs) {}",
    ]);
    expectError(parse, ["for(const i of t)"]);
  });
  test("while", () => {
    const parse = compile($.seq([whileStatement, $.eof()]));
    expectSame(parse, ["while(1) 1", "while(1) { break; }"]);
    expectError(parse, ["while(1)"]);
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

  test("switch", () => {
    const parse = compile($.seq([switchStatement, $.eof()]));
    expectSame(parse, [
      `switch (x) {}`,
      `switch(true){ default: 1 }`,
      `switch(x){ case 1: 1 }`,
      // `switch(x){
      //   case 1:
      //   case 2:
      //     return
      // }`,
    ]);
  });

  test("expressionStatement", () => {
    const parse = compile(expressionStatement);
    expectSame(parse, ["1", "func()", "a = 1", "a.b = 1", "1, 1"]);
  });

  test("variableStatement", () => {
    const parse = compile(variableStatement);
    expectSame(parse, [
      "let x",
      "let x,y",
      "let x,y,z",
      "let x,y=1,z",
      "let x=1",
      "const [] = []",
      "const {} = {}, [] = a",
    ]);
  });

  test("anyStatement", () => {
    const parse = compile(anyStatement);
    expectSame(parse, ["debugger", "{ a=1; }"]);
  });

  test("program:multiline", () => {
    const parse = compile(program);
    expectSame(parse, [
      "debugger;",
      "debugger; debugger;   debugger   ;",
      ";;;",
      "",
    ]);
  });

  test("program:with as", () => {
    const parse = compile(program);
    is(parse("1 as number;"), {
      result: "1;",
    });
  });

  run({ stopOnFail: true, stub: true, isMain });
}
