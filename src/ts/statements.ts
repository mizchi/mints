// TODO: use symbol
import "./expression";

import { anyExpression } from "./expression";
import { _, __, NodeTypes as T } from "./constants";
import { compile, builder as $ } from "./ctx";

const _typeAnnotation = $.seq([":", _, T.TypeExpression]);

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

const LabeledStatement = $.def(
  T.LabeledStatement,
  $.seq([T.Identifier, _, "\\:", _, blockOrNonEmptyStatement])
);

const _importRightSide = $.seq([
  $.or([
    // default only
    T.Identifier,
    $.seq(["\\*", __, "as", __, T.Identifier]),
    // TODO: * as b
    $.seq([
      "\\{",
      _,
      $.repeat_seq([
        T.Identifier,
        $.opt($.seq([__, "as", __, T.Identifier])),
        _,
        ",",
        _,
      ]),
      // last item
      $.opt(
        $.seq([
          T.Identifier,
          $.opt($.seq([__, "as", __, T.Identifier, _, ",?"])),
        ])
      ),
      _,
      "\\}",
    ]),
  ]),
  __,
  "from",
  __,
  T.StringLiteral,
]);

const importStatement = $.def(
  T.ImportStatement,
  $.or([
    // import 'specifier';
    $.seq(["import", __, T.StringLiteral]),
    // import type
    $.seq([$.skip($.seq(["import", __, "type", __, _importRightSide]))]),
    // import pattern
    $.seq(["import", __, _importRightSide]),
  ])
);

const defaultOrIdentifer = $.or(["default", T.Identifier]);

const exportStatement = $.def(
  T.ExportStatement,
  $.or([
    // TODO: skip: export type|interface
    $.seq([
      $.skip(
        $.seq([
          // import ... from "";
          "export",
          __,
          "type",
          __,
          // _importRightSide,
        ])
      ),
    ]),

    // export clause
    $.seq([
      "export",
      __,
      "\\{",
      _,
      $.repeat_seq([
        defaultOrIdentifer,
        $.opt($.seq([__, "as", __, defaultOrIdentifer])),
        _,
        ",",
        _,
      ]),
      // last item
      $.opt(
        $.seq([
          defaultOrIdentifer,
          $.opt($.seq([__, "as", __, defaultOrIdentifer])),
          ",?",
        ])
      ),
      _,
      "\\}",
      _,
      $.opt($.seq(["from", __, T.StringLiteral])),
    ]),
    // export named expression
    $.seq([
      "export",
      __,
      $.or([T.VariableStatement, T.FunctionExpression, T.ClassExpression]),
    ]),
  ])
);

const ifStatement = $.def(
  T.IfStatement,
  // $.or([
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
  ])
);

const switchStatement = $.def(
  T.SwitchStatement,
  $.or([
    $.seq([
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
        blockOrStatement,
        _,
        "(\\;)?", // optional closing semicolon
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
      $.repeat_seq([
        T.DestructivePattern,
        _,
        $.skip_opt(_typeAnnotation),
        _,
        $.opt(__assignSeq),
        _,
        ",",
        _,
      ]),
      _,
      T.DestructivePattern,
      _,
      $.skip_opt(_typeAnnotation),
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
  $.seq([anyExpression, $.repeat_seq([",", _, T.AnyExpression])])
);

const nonEmptyStatement = $.def(
  T.NonEmptyStatement,
  $.or([
    debuggerStatement,
    breakStatement,
    returnStatement,
    variableStatement,
    ifStatement,
    importStatement,
    forItemStatement,
    forStatement,
    doWhileStatement,
    whileStatement,
    switchStatement,
    LabeledStatement,
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
import { expectError, expectSame, formatError } from "./_testHelpers";
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
    is(parse("let x:number = 1"), { result: "let x= 1" });
    is(parse("let x:any"), { result: "let x" });
    is(parse("let x:number = 1,y:number=2"), { result: "let x= 1,y=2" });
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
      `switch(x){
        case 1:
        case 2:
      }`,
      `switch(x){
        case 1:
        case 2:
          return
      }`,
      `switch(x){
        case 1: {}
        case 2: {}
      }`,
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
    is(parse("let x = 1").result, "let x = 1");
    is(parse("let x: number = 1").result, "let x= 1");
  });

  test("importStatement", () => {
    const parse = compile(importStatement, { end: true });
    expectSame(parse, [
      "import 'foo'",
      "import * as b from 'xx'",
      "import a from 'b'",
      'import {} from "b"',
      'import {a} from "x"',
      'import {a, b} from "x"',
      'import {a as b} from "x"',
      'import {a as b, d as c,} from "x"',
    ]);
    // drop import type
    is(parse("import type a from 'xxx'").result, "");
    is(parse("import type * as b from 'xxx'").result, "");
    is(parse("import type {a as b} from 'xxx'").result, "");
  });
  test("exportStatement", () => {
    const parse = compile(exportStatement, { end: true });
    expectSame(parse, [
      "export {}",
      "export {a}",
      "export {a,b}",
      "export {a as b}",
      "export {a as default}",
      "export {default as default}",
      "export {} from 'a'",
      "export {default as x} from 'a'",
      "export const x = 1",
      "export function f(){}",
      "export class C {}",
    ]);
  });

  test("anyStatement", () => {
    const parse = compile(anyStatement);
    expectSame(parse, ["debugger", "{ a=1; }", "foo: {}", "foo: 1"]);
  });

  test("program", () => {
    const parse = compile(program, { end: true });
    expectSame(parse, [
      "debugger;",
      "debugger; debugger;   debugger   ;",
      ";;;",
      "",
      "import a from 'b';",
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
