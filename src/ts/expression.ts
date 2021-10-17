import { compile, builder as $ } from "./ctx";
import * as Literal from "./literal";
import { OPERATORS, NodeTypes as T, RESERVED_WORDS, _, __ } from "./constants";

const reserved = "(" + RESERVED_WORDS.join("|") + ")";
const identifier = $.def(
  T.Identifier,
  $.seq([$.not(reserved), "([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)"])
);

const ThisKeyword = $.tok("this");

const BINARY_OPS = "(" + OPERATORS.join("|") + ")";

// const destructiveObjectAssingment = $.or([
//   $.seq(["{", _, $.repeat_seq([identifier, _, ",", _]), "}"]),
//   $.seq(["{", _, identifier, "}"]),
// ]);

// const destructiveArrayAssingment = $.or([
//   $.seq(["{", _, $.repeat_seq([identifier, _, ",", _]), "}"]),
//   $.seq(["{", _, identifier, "}"]),
// ]);

const destructiveNode = $.or([T.DestructivePattern, identifier]);
const destructiveObjectKeyPair = $.or([
  $.seq([identifier, _, "\\:", _, destructiveNode]),
  identifier,
]);

const destructiveArrayItem = $.or([
  $.seq(["\\[", _, destructiveNode, _, "\\]"]),
  $.seq(["\\[", _, destructiveNode, _, "\\]"]),
  identifier,
]);

// TODO: Array
const destructiveAssignment = $.def(
  T.DestructivePattern,
  $.or([
    $.seq([
      "\\{",
      _,
      destructiveObjectKeyPair,
      _,
      $.repeat_seq([",", _, destructiveObjectKeyPair]),
      "\\}",
    ]),
    $.seq(["\\{", _, destructiveObjectKeyPair, "\\}"]),
    $.seq(["\\[", _, $.repeat_seq([destructiveNode, _, ",", _]), "\\]"]),
    $.seq(["\\[", _, destructiveNode, "\\]"]),
    identifier,
  ])
);

const arg = $.def(T.Argument, destructiveAssignment);

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
          $.seq(["\\[", T.UnaryExpression, "\\]"]),
        ])
      ),
    ]),
    Literal.anyLiteral,
  ])
);

const callable = $.def(
  T.CallExpression,
  $.or([
    // pattern: call chain
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

const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const assertSame = (parse: any, inputs: string[]) => {
    inputs.forEach((input) => {
      is(parse(input), {
        result: input,
      });
    });
  };
  const assertError = (parse: any, inputs: string[]) => {
    inputs.forEach((input) => {
      is(parse(input), {
        error: true,
      });
    });
  };

  test("identExpression", () => {
    const parse = compile(identifier);
    assertSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1"]);
    assertError(parse, ["1", "1_", "const"]);
  });

  test("memberExpression", () => {
    const parse = compile(memberable);
    assertSame(parse, ["a.b", "a", "a.b.c", "a[1]"]);
  });

  test("callExpression", () => {
    const parse = compile($.seq([callable, $.eof()]));
    assertSame(parse, ["a().a()"]);
    assertSame(parse, ["a().a.b()"]);
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
    assertSame(parse, [
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
    assertSame(parse, ["(1)", "((1))"]);
  });

  test("anyExpression", () => {
    const parse = compile(expression);
    assertSame(parse, [
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
    assertSame(parse, ["a", "$1"]);
    assertError(parse, ["1_", "const", "typeof"]);
  });

  test("expression", () => {
    const parse = compile($.seq([expression, $.eof()]));
    assertSame(parse, [
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
    assertError(parse, [",", "a,,", "a..", "xxx..xxx"]);
  });
  run({ stopOnFail: true, isMain });
}
