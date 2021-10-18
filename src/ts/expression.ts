import { compile, builder as $ } from "./ctx";
// import * as Literal from "./literal";
import {
  OPERATORS,
  NodeTypes as T,
  RESERVED_WORDS,
  _,
  __,
  SYMBOL,
} from "./constants";

const reserved = "(" + RESERVED_WORDS.join("|") + ")";
const identifier = $.def(
  T.Identifier,
  $.seq([$.not(reserved), "([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)"])
);

const ThisKeyword = $.tok("this");

const BINARY_OPS = "(" + OPERATORS.join("|") + ")";

/* Expression */

export const stringLiteral = $.def(
  T.StringLiteral,
  $.or([
    // double quote
    `("[^"\\n]*")`,
    // single
    `('[^'\\n]*')`,
    // backtick
    "(`[^`]*`)",
  ])
);

// export const ident = $.def("ident", "([a-zA-Z_$][a-zA-Z0-9_$]*)");
export const numberLiteral = $.def(T.NumberLiteral, `([1-9][0-9]*|[0-9])`);
export const booleanLiteral = $.def(T.BooleanLiteral, `(true|false)`);
export const nullLiteral = $.def(T.NullLiteral, `null`);
export const arrayLiteral = $.def(
  T.ArrayLiteral,
  $.or([
    $.seq([
      "\\[",
      _,
      T.AnyExpression,
      _,
      $.repeat(
        $.seq([
          // , item
          _,
          ",",
          _,
          T.AnyExpression,
        ])
      ),
      _,
      "\\]",
    ]),
    $.seq(["\\[", _, "\\]"], () => ({ type: "array", values: [] })),
  ])
);

// key: val
const objectKeyPair = $.seq([
  _,
  $.or([stringLiteral, SYMBOL]),
  _,
  "\\:",
  _,
  $.ref(T.AnyExpression),
]);

// ref by key
export const objectLiteral = $.def(
  T.ObjectLiteral,
  $.or([
    $.seq([
      "\\{",
      _,
      objectKeyPair,
      $.repeat(
        $.seq([_, ",", objectKeyPair]),
        undefined,
        (input) => input.item
      ),
      _,
      "\\}",
    ]),
    $.seq(["\\{", _, "\\}"], () => ({ type: "object", values: [] })),
  ])
);

export const anyLiteral = $.def(
  T.AnyLiteral,
  $.or([
    objectLiteral,
    arrayLiteral,
    stringLiteral,
    numberLiteral,
    booleanLiteral,
    nullLiteral,
  ])
);

// Destructive Pattren
// TODO: Array
const destructiveArrayPattern = $.def(
  T.DestructiveArrayPattern,
  $.or([
    $.seq([
      "\\[",
      _,
      $.repeat_seq([$.opt(T.DestructivePattern), _, ",", _]),
      _,
      $.opt(T.DestructivePattern),
      _,
      ",?",
      _,
      "\\]",
    ]),
    identifier,
  ])
);

const __destructiveObjectKeyPair = $.or([
  $.seq([identifier, _, "\\:", _, T.DestructivePattern]),
  identifier,
]);
const destructiveObjectPattern = $.def(
  T.DestructiveObjectPattern,
  $.or([
    $.seq([
      "\\{",
      _,
      __destructiveObjectKeyPair,
      _,
      $.repeat_seq([",", _, __destructiveObjectKeyPair]),
      _,
      "(,?)",
      "\\}",
    ]),
    $.seq(["\\{", _, $.opt(__destructiveObjectKeyPair), _, "\\}"]),
    identifier,
  ])
);

const destructivePattern = $.def(
  T.DestructivePattern,
  $.or([destructiveObjectPattern, destructiveArrayPattern, identifier])
);

const arg = $.def(T.Argument, destructivePattern);
const args = $.def(
  T.Arguments,
  $.or([
    // (a,)b
    $.seq([$.repeat_seq([arg, ","]), arg]),
    // a,b,
    $.seq([$.repeat_seq([arg, ","])]),
    _,
  ])
);

// TODO: statment
const BlockOrStatement = $.seq(["\\{", _, "\\}"]);
const functionExpression = $.seq([
  "function",
  __,
  "\\(",
  _,
  args,
  _,
  "\\)",
  _,
  BlockOrStatement,
]);

const callArguments = $.or([
  // a, b, c
  $.seq([$.repeat_seq([T.UnaryExpression, _, ","]), T.UnaryExpression]),
  // a, b, c,
  $.seq([$.repeat_seq([T.UnaryExpression, _, ","])]),
]);

const paren = $.seq(["\\(", _, T.AnyExpression, _, "\\)"]);
const primary = $.or([paren, ThisKeyword, identifier]);
const memberable = $.def(
  T.MemberExpression,
  $.or([
    $.seq([
      primary,
      $.repeat(
        $.or([
          $.seq(["\\.", identifier]),
          $.seq(["\\[", _, T.AnyExpression, _, "\\]"]),
        ])
      ),
    ]),
    anyLiteral,
  ])
);

// call chain access and member access
const callable = $.def(
  T.CallExpression,
  $.or([
    // call chain
    $.seq([
      memberable,
      _,
      "\\(",
      _,
      callArguments,
      _,
      "\\)",
      $.repeat(
        $.or([
          // dynamic access
          $.seq(["\\[", T.AnyExpression, "\\]"]),
          // chain access
          $.seq([
            "\\.",
            $.or([T.MemberExpression]),
            // call or access
            $.opt($.seq(["\\(", _, callArguments, _, "\\)"])),
          ]),
        ])
      ),
    ]),
    memberable,
  ])
);

const unary = $.def(
  T.UnaryExpression,
  $.or([
    // with unary prefix
    $.seq([
      $.or(["\\+\\+", "\\-\\-", "void ", "typeof ", "delete ", "\\~", "\\!"]),
      $.or([paren, callable]),
    ]),
    // with optional postfix
    $.seq([$.or([paren, callable]), $.opt($.or(["\\+\\+", "\\-\\-"]))]),
  ])
);

const binaryExpression = $.def(
  T.BinaryExpression,
  $.or([$.seq([unary, $.repeat_seq([_, BINARY_OPS, _, unary])])])
);

export const anyExpression = $.def(T.AnyExpression, $.or([binaryExpression]));

export const expression = $.def(
  T.Expression,
  $.seq([anyExpression, $.repeat_seq([",", _, anyExpression])])
);

import { test, run, is } from "@mizchi/test";
import { expectError, expectSame } from "./_testHelpers";

const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  test("string", () => {
    const parseString = compile(stringLiteral);
    is(parseString('"hello"').result, '"hello"');
  });

  test("array", () => {
    const parseArray = compile(arrayLiteral);
    expectSame(parseArray, ["[null]", "[1,2]", "[1, a, {}]"]);
  });

  test("json", () => {
    const parseExpression = compile(anyLiteral);
    expectSame(parseExpression, [
      `{ "a" : 1, "b": "text", "c" : true, "d": null }`,
      `{ "a": { "b": "2" }, c: {}, "d": [1], "e": [{} ] }`,
    ]);
  });

  test("identExpression", () => {
    const parse = compile(identifier);
    expectSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1"]);
    expectError(parse, ["1", "1_", "const"]);
  });

  test("memberExpression", () => {
    const parse = compile(memberable);
    expectSame(parse, ["a.b", "a", "a.b.c", "a[1]"]);
  });

  test("callExpression", () => {
    const parse = compile($.seq([callable, $.eof()]));
    expectSame(parse, ["a().a()"]);
    expectSame(parse, ["a().a.b()"]);
  });

  test("functionExpression", () => {
    const parse = compile(functionExpression);
    is(parse("function () {}").result, "function () {}");
    is(parse("function (a,) {}").result, "function (a,) {}");
    is(parse("function (a,b) {}").result, "function (a,b) {}");
    is(parse("function ({a}) {}").result, "function ({a}) {}");
    is(parse("function ({a, b}) {}"), { result: "function ({a, b}) {}" });
  });

  test("callExpression", () => {
    const parse = compile(callable);
    is(parse("func()").result, "func()");
    is(parse("func([])").result, "func([])");
    is(parse("func(1,2)").result, "func(1,2)");
    is(parse("func(1,2,)").result, "func(1,2,)");
  });

  test("binaryExpr", () => {
    const parse = compile(binaryExpression);
    expectSame(parse, [
      "a + a",
      "1 = 1",
      "1 + 1",
      "1 * 2",
      "1*2",
      "1**2",
      "1 + (1)",
      "(1) + 1",
      "( 1 + 1) + 1",
      "( 1 + 1) * 1 + 2 / (3 / 4)",
    ]);
  });

  test("parenExpr", () => {
    const parse = compile(paren);
    expectSame(parse, ["(1)", "((1))"]);
  });

  test("anyExpression", () => {
    const parse = compile(expression);
    expectSame(parse, [
      "i in []",
      "a = 1",
      "a ?? b",
      "1 + 1",
      "(1)",
      "1",
      "(1 + 1)",
      "1 + 1 + 1",
      "(1 + (1 * 2))",
      "((1 + 1) + (1 * 2))",
    ]);
  });
  test("identifier", () => {
    const parse = compile(identifier);
    expectSame(parse, ["a", "$1"]);
    expectError(parse, ["1_", "const", "typeof"]);
  });

  test("destructivePattern", () => {
    const parse = compile(destructivePattern, { end: true });
    expectSame(parse, ["a", `{a}`, `{a: b}`, `{a:{b,c}}`, `{a: [a]}`]);
    expectSame(parse, ["[]", `[a]`, `[[a,b]]`]);
    expectError(parse, ["a.b"]);
  });

  test("expression", () => {
    const parse = compile($.seq([expression, $.eof()]));
    expectSame(parse, [
      "a",
      "a, a",
      "a,a,a",
      "a().a",
      "--a",
      "b++",
      "a instanceof Array",
      "a[1]()",
      "a.b()[1]",
      "a().b[x][1]",
    ]);
    expectError(parse, [",", "a,,", "a..", "xxx..xxx"]);
  });
  run({ stopOnFail: true, isMain });
}
