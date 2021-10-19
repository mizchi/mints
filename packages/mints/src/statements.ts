// TODO: use symbol
import "./expression";

import { anyExpression } from "./expression";
import {
  AnyExpression,
  AnyStatement,
  Block,
  BlockStatement,
  BreakStatement,
  ClassExpression,
  DebuggerStatement,
  DeclareVariableStatement,
  DestructivePattern,
  DoWhileStatement,
  EmptyStatement,
  ExportStatement,
  ExpressionStatement,
  ForItemStatement,
  ForStatement,
  FunctionExpression,
  Identifier,
  IfStatement,
  ImportStatement,
  InterfaceStatement,
  LabeledStatement,
  NonEmptyStatement,
  Program,
  ReturnStatement,
  StringLiteral,
  SwitchStatement,
  ThrowStatement,
  TypeExpression,
  TypeObjectLiteral,
  TypeStatement,
  VariableStatement,
  WhileStatement,
  _,
  __,
} from "./constants";
import { compile, builder as $ } from "./ctx";

const _typeAnnotation = $.seq([":", _, TypeExpression]);

const emptyStatement = $.def(EmptyStatement, $.seq(["[\\s\\n;]*"]));
const breakStatement = $.def(BreakStatement, "break");
const debuggerStatement = $.def(DebuggerStatement, "debugger");

const returnStatement = $.def(
  ReturnStatement,
  $.seq(["(return|yield)", $.opt($.seq([__, AnyExpression]))])
);

const throwStatement = $.def(
  ThrowStatement,
  $.seq(["throw", __, AnyExpression])
);

const blockOrStatement = $.or([Block, AnyStatement]);
const blockOrNonEmptyStatement = $.or([Block, NonEmptyStatement]);

const blockStatement = $.def(BlockStatement, Block);

const labeledStatement = $.def(
  LabeledStatement,
  $.seq([Identifier, _, "\\:", _, blockOrNonEmptyStatement])
);

const _importRightSide = $.seq([
  $.or([
    // default only
    Identifier,
    $.seq(["\\*", __, "as", __, Identifier]),
    // TODO: * as b
    $.seq([
      "\\{",
      _,
      $.repeat_seq([
        Identifier,
        $.opt($.seq([__, "as", __, Identifier])),
        _,
        ",",
        _,
      ]),
      // last item
      $.opt(
        $.seq([Identifier, $.opt($.seq([__, "as", __, Identifier, _, ",?"]))])
      ),
      _,
      "\\}",
    ]),
  ]),
  __,
  "from",
  __,
  StringLiteral,
]);

const importStatement = $.def(
  ImportStatement,
  $.or([
    // import 'specifier';
    $.seq(["import", __, StringLiteral]),
    // import type
    $.seq([$.skip($.seq(["import", __, "type", __, _importRightSide]))]),
    // import pattern
    $.seq(["import", __, _importRightSide]),
  ])
);

const defaultOrIdentifer = $.or(["default", Identifier]);

const exportStatement = $.def(
  ExportStatement,
  $.or([
    // TODO: skip: export type|interface
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
      $.opt($.seq(["from", __, StringLiteral])),
    ]),
    // export named expression
    $.seq([
      "export",
      __,
      $.or([VariableStatement, FunctionExpression, ClassExpression]),
    ]),
  ])
);

const ifStatement = $.def(
  IfStatement,
  // $.or([
  $.seq([
    // if
    "if",
    _,
    "\\(",
    _,
    AnyExpression,
    _,
    "\\)",
    _,
    blockOrNonEmptyStatement,
    _,
    $.opt($.seq(["else", __, blockOrStatement])),
  ])
);

const switchStatement = $.def(
  SwitchStatement,
  $.or([
    $.seq([
      "switch",
      _,
      "\\(",
      _,
      AnyExpression,
      _,
      "\\)",
      _,
      "\\{",
      _,
      $.repeat_seq([
        "case",
        __,
        AnyExpression,
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

const __assignSeq = $.seq(["=", _, AnyExpression]);
export const variableStatement = $.def(
  VariableStatement,
  $.or([
    $.seq([
      // single
      "(var|const|let)",
      __,
      // x, y=1,
      $.repeat_seq([
        DestructivePattern,
        _,
        $.skip_opt(_typeAnnotation),
        _,
        $.opt(__assignSeq),
        _,
        ",",
        _,
      ]),
      _,
      DestructivePattern,
      _,
      $.skip_opt(_typeAnnotation),
      _,
      $.opt(__assignSeq),
    ]),
  ])
);

const declareVariableStatement = $.def(
  DeclareVariableStatement,
  $.seq([$.skip($.seq(["declare", __, variableStatement]))])
);

const typeStatement = $.def(
  TypeStatement,
  $.seq([
    $.skip(
      $.seq([
        $.opt($.seq(["export\\s+"])),
        "type",
        __,
        Identifier,
        _,
        "=",
        _,
        TypeExpression,
      ])
    ),
  ])
);
const interfaceStatement = $.def(
  InterfaceStatement,
  $.seq([
    // skip all
    $.skip(
      $.seq([
        $.opt($.seq(["export\\s+"])),
        "interface",
        __,
        Identifier,
        $.opt($.seq([__, "extends", __, TypeExpression])),
        _,
        TypeObjectLiteral,
      ])
    ),
  ])
);

export const forStatement = $.def(
  ForStatement,
  $.seq([
    "for",
    _,
    "\\(",
    _,
    // start
    $.or([variableStatement, AnyExpression, _]),
    _,
    "\\;",
    // condition
    _,
    $.opt(AnyExpression),
    _,
    "\\;",
    // step end
    $.opt(AnyExpression),
    "\\)",
    _,
    blockOrNonEmptyStatement,
  ])
);

// include for in / for of
const forItemStatement = $.def(
  ForItemStatement,
  $.seq([
    "for",
    _,
    "\\(",
    _,
    "(var|const|let)",
    __,
    DestructivePattern,
    __,
    "(of|in)",
    __,
    AnyExpression,
    _,
    "\\)",
    _,
    blockOrNonEmptyStatement,
  ])
);

export const whileStatement = $.def(
  WhileStatement,
  $.or([
    $.seq([
      "while",
      _,
      "\\(",
      _,
      AnyExpression,
      _,
      "\\)",
      _,
      blockOrNonEmptyStatement,
    ]),
  ])
);

const doWhileStatement = $.def(
  DoWhileStatement,
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
      AnyExpression,
      _,
      "\\)",
    ]),
  ])
);

const expressionStatement = $.def(
  ExpressionStatement,
  $.seq([anyExpression, $.repeat_seq([",", _, AnyExpression])])
);

const nonEmptyStatement = $.def(
  NonEmptyStatement,
  $.or([
    debuggerStatement,
    breakStatement,
    returnStatement,
    declareVariableStatement,
    variableStatement,
    typeStatement,
    interfaceStatement,
    ifStatement,
    importStatement,
    forItemStatement,
    forStatement,
    doWhileStatement,
    whileStatement,
    switchStatement,
    labeledStatement,
    blockStatement,
    expressionStatement,
  ])
);

export const anyStatement = $.def(
  AnyStatement,
  $.or([nonEmptyStatement, emptyStatement])
);

const statementLine = $.or([
  $.seq([
    _,
    $.or([
      "\\/\\/[^\\n]*",
      // semicolon less allowed statements
      blockStatement,
      ifStatement,
      whileStatement,
      blockStatement,
      forItemStatement,
      interfaceStatement,
      FunctionExpression,
      ClassExpression,
    ]),
    _,
    "(\\;?\\n?|\\n)",
  ]),
  // semicolon
  $.seq([_, anyStatement, _, "(\\;\\n?|\\n)"]),
  $.seq([_, ";", _]),
]);

export const block = $.def(
  Block,
  $.seq(["{", _, $.repeat(statementLine), _, "}"])
);

export const program = $.def(
  Program,
  $.seq([$.repeat(statementLine), _, $.eof()])
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
    is(parse("declare const x: number;"), { result: ";" });
    is(parse("declare const x: number = 1;"), { result: ";" });
    is(parse("type x = number;"), { result: ";" });
    is(parse("type x = {};"), { result: ";" });
    is(parse("export type x = number;"), { result: ";" });
    is(parse("interface I {};"), { result: ";" });
    is(parse("interface I extends T {};"), { result: ";" });
    is(parse("interface I extends T { a: number; };"), { result: ";" });
    is(parse("export interface I {};"), { result: ";" });
  });

  test("program:with as", () => {
    const parse = compile(program);
    is(parse("1 as number;"), {
      result: "1;",
    });
  });

  run({ stopOnFail: true, stub: true, isMain });
}
