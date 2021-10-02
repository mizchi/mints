import { createContext } from "./index";

import type { Builder } from "./index";
import { defineLiteral } from "./literal";
import { BinaryOperators, NodeTypes, RESERVED_WORDS, _, __ } from "./constants";

//TODO: EOF
export function defineExpressions(
  $: Builder,
  Literal: ReturnType<typeof defineLiteral>
) {
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

  const BINARY_OPS = "(" + BinaryOperators.join("|") + ")";

  const lefthandSideExpression = $.def(
    NodeTypes.LefthandSideExpression,
    // TODO: Call expr
    $.or([parenExpression, $.ref(NodeTypes.CallExpression), identifier])
  );

  const PrimaryExpression = $.def(
    "primary",
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
          // t[1]
          // $.seq(["\\[", $.ref(NodeTypes.MemberAccessExpression), "\\]"]),
          $.seq(["\\[", $.ref(NodeTypes.AnyExpression), "\\]"]),

          // t.a, t?.a
          $.seq(["(\\.|\\?\\.)", identifier]),
        ])
      ),
      // $.not("\\s*\\("),
    ])
  );
  const callExpression = $.def(
    NodeTypes.CallExpression,
    // TODO: args
    $.seq([memberAccessExpression, _, "\\(", _, "\\)"])
  );

  const unaryExpression = $.def(
    "unaryExpression",
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
        $.ref("unaryExpression"),
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
    "binaryExpression",
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

  const anyExprression = $.def(
    NodeTypes.AnyExpression,
    $.or([
      parenExpression,
      binaryExpression,
      unaryExpression,
      memberAccessExpression,
      callExpression,
    ])
  );
  return {
    binaryExpression,
    parenExpression,
    anyExprression,
    unaryExpression,
    memberAccessExpression,
    callExpression,
    identifier,
    // memberAccessExpression,
  };
}

// @ts-ignore
import { test, run } from "@mizchi/testio/dist/testio.cjs";
import assert from "assert";
if (process.env.NODE_ENV === "test" && require.main === module) {
  const { compile, builder: $ } = createContext();
  const L = defineLiteral($);
  const Expression = defineExpressions($, L);

  // @ts-ignore
  const eq = (...args: any[]) => assert.deepStrictEqual(...(args as any));

  const assertSame = (parse: any, inputs: string[]) => {
    inputs.forEach((input) => {
      eq(parse(input).result, input);
    });
  };
  const assertError = (parse: any, inputs: string[]) => {
    inputs.forEach((input) => {
      eq(parse(input).error, true);
    });
  };

  test("identExpr", () => {
    const parse = compile(Expression.identifier);
    assertSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1"]);
    assertError(parse, ["1", "1_", "const"]);
  });

  test("memberExpr", () => {
    const parse = compile(Expression.memberAccessExpression);
    assertSame(parse, ["a.b"]);
    assertSame(parse, ["a.b.c"]);
    assertSame(parse, ["a[1]"]);

    // assertError(parse, ["1", "1_", "const"]);
  });

  test("callExpr", () => {
    const parse = compile(Expression.callExpression);
    assertSame(parse, [
      "a()",
      "a.b()",
      "a[1]()",
      // TODO
      "a.b().c()",
    ]);
    // assertError(parse, ["1", "1_", "const"]);
  });

  test("unaryExpr", () => {
    const parse = compile(Expression.unaryExpression);
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
    const parse = compile(Expression.binaryExpression);
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
    const parse = compile(Expression.parenExpression);
    assertSame(parse, ["(1)", "((1))"]);
  });

  test("anyExpression", () => {
    const parse = compile(Expression.anyExprression);
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

  run({ stopOnFail: true, stub: true });
}
