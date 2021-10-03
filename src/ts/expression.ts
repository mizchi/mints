import { compile, builder as $ } from "./ctx";
import * as Literal from "./literal";
import { OPERATORS, NodeTypes, RESERVED_WORDS, _, __ } from "./constants";

//TODO: EOF
// export function defineExpressions(Literal: ReturnType<typeof defineLiteral>) {
// const ANY_EXPRESSION = "anyExpression";

const reserved = "(" + RESERVED_WORDS.join("|") + ")";
const identifier = $.def(
  NodeTypes.Identifier,
  $.seq([$.not(reserved), "([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)"])
);

const parenExpression = $.def(
  NodeTypes.ParenExpression,
  $.seq(["\\(", _, $.ref(NodeTypes.AnyExpression), _, "\\)"])
);

const BINARY_OPS = "(" + OPERATORS.join("|") + ")";

const lefthandSideExpression = $.def(
  NodeTypes.LefthandSideExpression,
  // TODO: Call expr
  $.or([parenExpression, $.ref(NodeTypes.CallExpression), identifier])
);

const PrimaryExpression = $.def(
  undefined,
  $.or([
    "this",
    identifier,
    Literal.anyLiteral,
    parenExpression,
    $.ref(NodeTypes.CallExpression),
  ])
);
const memberAccessExpression = $.def(
  NodeTypes.MemberAccessExpression,
  $.seq([
    PrimaryExpression,
    $.repeat(
      $.or([
        // t[property]
        // $.seq(["\\[", $.ref(NodeTypes.MemberAccessExpression), "\\]"]),
        $.seq(["\\[", $.ref(NodeTypes.AnyExpression), "\\]"]),
        // t.a, t?.a
        $.seq([
          "(\\.|\\?\\.)",
          $.or([
            // property
            identifier,
          ]),
        ]),
      ])
    ),
    // $.not("\\s*\\("),
  ])
);

const callable = $.or([identifier]);
const callExpression = $.def(
  NodeTypes.CallExpression,
  // TODO: args
  // $.seq([memberAccessExpression, _, "\\(", _, "\\)"])
  $.seq([callable, _, "\\(", _, "\\)"])
);

const unaryExpression = $.def(
  NodeTypes.UnaryExpression,
  $.or([
    // unary prefix
    $.seq([
      $.or([
        // TODO: handle delete{}
        "delete ",
        // TODO: handle void(0)
        "void ",
        "typeof ",
        "\\+\\+",
        "\\-\\-",
        $.seq(["\\+", $.not("\\=")]),
        $.seq(["\\-", $.not("\\=")]),
        "\\~",
        "\\!",
      ]),
      $.ref(NodeTypes.UnaryExpression),
    ]),
    // unary postfix
    // NOTE: before paren expression
    $.seq([
      lefthandSideExpression,
      // $.ref(createNoSubstitutionTemplateLiteral),
      $.or(["\\+\\+", "\\-\\-"]),
    ]),
    parenExpression,
    // TODO: postfix;
    // $.seq([$.ref("unaryExpression"), unaryPostfixOperator]),
    identifier,
    Literal.anyLiteral,
  ])
);

const binaryExpression = $.def(
  NodeTypes.BinaryExpression,
  $.seq([
    // TODO: impl $.not() operator
    // Literal.anyLiteral,
    unaryExpression,
    // $.ref(ANY_EXPRESSION),
    $.repeat(
      $.seq(
        //
        [_, BINARY_OPS, _, unaryExpression]
      )
    ),
  ])
);

export const anyExpression = $.def(
  NodeTypes.AnyExpression,
  $.or([
    parenExpression,
    binaryExpression,
    unaryExpression,
    memberAccessExpression,
    callExpression,
  ])
);

import { test, run, is, cancel } from "@mizchi/test";

const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  // const { compile, builder: $ } = createContext();
  const assertSame = (parse: any, inputs: string[]) => {
    inputs.forEach((input) => {
      is(parse(input).result, input);
    });
  };
  const assertError = (parse: any, inputs: string[]) => {
    inputs.forEach((input) => {
      is(parse(input).error, true);
    });
  };

  test("identExpr", () => {
    const parse = compile(identifier);
    assertSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1"]);
    assertError(parse, ["1", "1_", "const"]);
  });

  test("memberExpr", () => {
    const parse = compile(memberAccessExpression);
    assertSame(parse, ["a.b"]);
    assertSame(parse, ["a.b.c"]);
    assertSame(parse, ["a[1]"]);
    // assertError(parse, ["1", "1_", "const"]);
  });

  test("callExpr", () => {
    const parse = compile(callExpression);
    assertSame(parse, [
      "a()",
      // "a.b()",
      "a[1]()",
      // TODO
      // "a.b().c()",
    ]);
    // assertError(parse, ["1", "1_", "const"]);
  });
  cancel();

  test("unaryExpr", () => {
    const parse = compile(unaryExpression);
    assertSame(parse, [
      "1",
      "++1",
      "typeof a",
      "typeof (a)",
      "delete 1",
      "void a",
      "--a",
    ]);
    // assertError(parse, ["1 +", "1 + +", "1 + + 1"]);
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
    // assertError(parse, ["1 +", "1 + +", "1 + + 1"]);
  });

  test("parenExpr", () => {
    const parse = compile(parenExpression);
    assertSame(parse, ["(1)", "((1))"]);
  });

  test("anyExpression", () => {
    const parse = compile(anyExpression);
    assertSame(parse, [
      "a = 1",
      "a ?? b",
      "1 + 1",
      "(1)",
      "1",
      "(1 + 1)",
      "1 + 1 + 1",
      "(1 + (1 * 2))",
      // "((1 + 1) + (1 * 2))",
    ]);
    // eq(parse("1 + 1").result, "1 + 1");
    // eq(parse("(1)").result, "(1)");
    // eq(parse("1").result, "1");
    // eq(parse("(1 + 1)").result, "(1 + 1)");
    // eq(parse("(1 + (1 * 2))").result, "(1 + (1 * 2))");
  });

  run({ stopOnFail: true, isMain });
}
