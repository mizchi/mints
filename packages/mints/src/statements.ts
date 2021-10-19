// TODO: use symbol
import {
  anyExpression,
  classExpression,
  destructivePattern,
  functionExpression,
  identifier,
  stringLiteral,
} from "./expression";
import {
  // AnyExpression,
  // AnyExpression,
  // AnyStatement,
  // Block,
  // BlockStatement,
  // BreakStatement,
  // ClassExpression,
  // DebuggerStatement,
  // DeclareVariableStatement,
  // DestructivePattern,
  // DoWhileStatement,
  // EmptyStatement,
  // ExportStatement,
  // ExpressionStatement,
  // ForItemStatement,
  // ForStatement,
  // FunctionExpression,
  // Identifier,
  // IfStatement,
  // ImportStatement,
  // InterfaceStatement,
  // LabeledStatement,
  // NonEmptyStatement,
  // Program,
  // ReturnStatement,
  // StringLiteral,
  // SwitchStatement,
  // ThrowStatement,
  // TypeExpression,
  // TypeObjectLiteral,
  // TypeStatement,
  // VariableStatement,
  // WhileStatement,
  _,
  __,
} from "./constants";
import { compile, builder as $ } from "./ctx";

const _typeAnnotation = $.seq([":", _, typeExpression]);

const emptyStatement = $.def(() => $.seq(["[\\s\\n;]*"]));
const breakStatement = $.def(() => "break");
const debuggerStatement = $.def(() => "debugger");

const returnStatement = $.def(() =>
  $.seq(["(return|yield)", $.opt($.seq([__, anyExpression]))])
);

const throwStatement = $.def(() => $.seq(["throw", __, anyExpression]));

const blockOrStatement = $.def(() => $.or([block, anyStatement]));
const blockOrNonEmptyStatement = $.def(() => $.or([block, nonEmptyStatement]));

const blockStatement = $.def(() => block);

const labeledStatement = $.def(() =>
  $.seq([identifier, _, "\\:", _, blockOrNonEmptyStatement])
);

const _importRightSide = $.def(() =>
  $.seq([
    $.or([
      // default only
      identifier,
      $.seq(["\\*", __, "as", __, identifier]),
      // TODO: * as b
      $.seq([
        "\\{",
        _,
        $.repeat_seq([
          identifier,
          $.opt($.seq([__, "as", __, identifier])),
          _,
          ",",
          _,
        ]),
        // last item
        $.opt(
          $.seq([identifier, $.opt($.seq([__, "as", __, identifier, _, ",?"]))])
        ),
        _,
        "\\}",
      ]),
    ]),
    __,
    "from",
    __,
    stringLiteral,
  ])
);

const importStatement = $.def(() =>
  $.or([
    // import 'specifier';
    $.seq(["import", __, stringLiteral]),
    // import type
    $.seq([$.skip($.seq(["import", __, "type", __, _importRightSide]))]),
    // import pattern
    $.seq(["import", __, _importRightSide]),
  ])
);

const defaultOrIdentifer = $.or(["default", identifier]);

const exportStatement = $.def(() =>
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
      $.opt($.seq(["from", __, stringLiteral])),
    ]),
    // export named expression
    $.seq([
      "export",
      __,
      $.or([variableStatement, functionExpression, classExpression]),
    ]),
  ])
);

const ifStatement = $.def(() =>
  // $.or([
  $.seq([
    // if
    "if",
    _,
    "\\(",
    _,
    anyExpression,
    _,
    "\\)",
    _,
    blockOrNonEmptyStatement,
    _,
    $.opt($.seq(["else", __, blockOrStatement])),
  ])
);

const switchStatement = $.def(() =>
  $.or([
    $.seq([
      "switch",
      _,
      "\\(",
      _,
      anyExpression,
      _,
      "\\)",
      _,
      "\\{",
      _,
      $.repeat_seq([
        "case",
        __,
        anyExpression,
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

const __assignSeq = $.seq(["=", _, anyExpression]);
export const variableStatement = $.def(() =>
  $.or([
    $.seq([
      // single
      "(var|const|let)",
      __,
      // x, y=1,
      $.repeat_seq([
        destructivePattern,
        _,
        $.skip_opt(_typeAnnotation),
        _,
        $.opt(__assignSeq),
        _,
        ",",
        _,
      ]),
      _,
      destructivePattern,
      _,
      $.skip_opt(_typeAnnotation),
      _,
      $.opt(__assignSeq),
    ]),
  ])
);

const declareVariableStatement = $.def(() =>
  $.seq([$.skip($.seq(["declare", __, variableStatement]))])
);

const typeStatement = $.def(() =>
  $.seq([
    $.skip(
      $.seq([
        $.opt($.seq(["export\\s+"])),
        "type",
        __,
        identifier,
        _,
        "=",
        _,
        typeExpression,
      ])
    ),
  ])
);
const interfaceStatement = $.def(() =>
  $.seq([
    // skip all
    $.skip(
      $.seq([
        $.opt($.seq(["export\\s+"])),
        "interface",
        __,
        identifier,
        $.opt($.seq([__, "extends", __, typeExpression])),
        _,
        typeObjectLiteral,
      ])
    ),
  ])
);

export const forStatement = $.def(() =>
  $.seq([
    "for",
    _,
    "\\(",
    _,
    // start
    $.or([variableStatement, anyExpression, _]),
    _,
    "\\;",
    // condition
    _,
    $.opt(anyExpression),
    _,
    "\\;",
    // step end
    $.opt(anyExpression),
    "\\)",
    _,
    blockOrNonEmptyStatement,
  ])
);

// include for in / for of
const forItemStatement = $.def(() =>
  $.seq([
    "for",
    _,
    "\\(",
    _,
    "(var|const|let)",
    __,
    destructivePattern,
    __,
    "(of|in)",
    __,
    anyExpression,
    _,
    "\\)",
    _,
    blockOrNonEmptyStatement,
  ])
);

export const whileStatement = $.def(() =>
  $.or([
    $.seq([
      "while",
      _,
      "\\(",
      _,
      anyExpression,
      _,
      "\\)",
      _,
      blockOrNonEmptyStatement,
    ]),
  ])
);

const doWhileStatement = $.def(() =>
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
      anyExpression,
      _,
      "\\)",
    ]),
  ])
);

const expressionStatement = $.def(() =>
  $.seq([anyExpression, $.repeat_seq([",", _, anyExpression])])
);

const nonEmptyStatement = $.def(() =>
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

export const anyStatement = $.def(() =>
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
      functionExpression,
      classExpression,
    ]),
    _,
    "(\\;?\\n?|\\n)",
  ]),
  // semicolon
  $.seq([_, anyStatement, _, "(\\;\\n?|\\n)"]),
  $.seq([_, ";", _]),
]);

export const block = $.def(() =>
  $.seq(["{", _, $.repeat(statementLine), _, "}"])
);

export const program = $.def(() =>
  $.seq([$.repeat(statementLine), _, $.eof()])
);

import { test, run, is } from "@mizchi/test";
import { expectError, expectSame, formatError } from "./_testHelpers";
import { typeExpression, typeObjectLiteral } from "./type";
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
