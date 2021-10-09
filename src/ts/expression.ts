import { compile, builder as $ } from "./ctx";
import * as Literal from "./literal";
import { OPERATORS, NodeTypes, RESERVED_WORDS, _, __ } from "./constants";

const reserved = "(" + RESERVED_WORDS.join("|") + ")";
const identifier = $.def(
  NodeTypes.Identifier,
  $.seq([$.not(reserved), "([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)"])
);

const ThisKeyword = $.tok("this");

const BINARY_OPS = "(" + OPERATORS.join("|") + ")";

const destructiveAssignment = $.seq(["{", _, $.or([identifier]), _, "}"]);
const arg = $.def(
  NodeTypes.Argument,
  $.or([destructiveAssignment, identifier])
);
const args = $.def(
  NodeTypes.Arguments,
  $.or([
    // (a,)b
    $.seq([$.repeat_seq([arg, ","]), arg]),
    // a,b,
    $.seq([$.repeat_seq([arg, ","])]),
    _,
  ])
);

// TODO: statment
const Block = $.seq(["\\{", _, "\\}"]);
const functionExpression = $.seq([
  "function",
  __,
  "\\(",
  _,
  args,
  _,
  "\\)",
  _,
  Block,
]);

const callArguments = $.or([
  // a, b, c
  $.seq([
    $.repeat_seq([NodeTypes.UnaryExpression, _, ","]),
    // last arg
    NodeTypes.UnaryExpression,
  ]),
  // a, b, c,
  $.seq([$.repeat_seq([NodeTypes.UnaryExpression, _, ","])]),
  _,
]);

const callExpression = $.def(
  NodeTypes.CallExpression,
  $.or([
    // call chain!
    $.seq([
      $.or([NodeTypes.MemberExpression]),
      _,
      "\\(",
      _,
      callArguments,
      // args,
      _,
      "\\)",
      $.repeat(
        $.seq([
          "\\.",
          $.or([NodeTypes.MemberExpression]),
          "\\(",
          _,
          callArguments,
          _,
          "\\)",
        ]),
        [1]
      ),
    ]),
    $.seq([
      $.or([NodeTypes.MemberExpression]),
      _,
      "\\(",
      _,
      callArguments,
      // args,
      _,
      "\\)",
      $.not("\\."),
    ]),
  ])
);

// call chain support
// const callExpression = $.def(
//   NodeTypes.CallExpression,
//   $.or([
//     // [unary]().[unary]().[unary]()
//     $.seq([
//       // $.or([NodeTypes.UnaryMemberExpression, NodeTypes.UnaryCallExpression]),
//       NodeTypes.UnaryExpression,
//       _,
//       "\\(",
//       _,
//       callArguments,
//       // args,
//       _,
//       "\\)",
//       // .mem.ber.()
//       $.repeat(
//         $.seq([
//           "\\.",
//           NodeTypes.UnaryExpression,
//           "\\(",
//           _,
//           callArguments,
//           // args,
//           _,
//           "\\)",
//         ])
//       ),
//     ]),
//     // a()
//     // $.seq([
//     //   $.or([NodeTypes.UnaryMemberExpression, NodeTypes.UnaryCallExpression]),
//     //   _,

//     //   "\\(",
//     //   _,
//     //   callArguments,
//     //   // args,
//     //   _,
//     //   "\\)",
//     // ]),
//   ])
// );

const parenExpression = $.seq(["\\(", _, NodeTypes.UnaryExpression, _, "\\)"]);
const primary = $.or([parenExpression, identifier]);
// const property = $.or([identifier]);
const memberExpression = $.def(
  NodeTypes.MemberExpression,
  $.or([
    $.seq([
      primary,
      $.repeat(
        $.or([
          $.seq(["\\.", identifier]),
          $.seq(["\\[", NodeTypes.UnaryExpression, "\\]"]),
        ]),
        [1]
      ),
    ]),
    primary,
    // primary,
  ])
);

// const unaryExpression = $.def(
//   NodeTypes.UnaryExpression,
//   $.or([
//     // unary prefix
//     $.seq([
//       $.or([
//         // TODO: handle delete{}
//         "delete ",
//         // TODO: handle void(0)
//         "void ",
//         "typeof ",
//         "\\+\\+",
//         "\\-\\-",
//         $.seq(["\\+", $.not("\\=")]),
//         $.seq(["\\-", $.not("\\=")]),
//         "\\~",
//         "\\!",
//       ]),
//       $.ref(NodeTypes.UnaryExpression),
//     ]),
//     // unary postfix
//     // NOTE: before paren expression
//     $.seq([
//       lefthandSideExpression,
//       // $.ref(createNoSubstitutionTemplateLiteral),
//       $.or(["\\+\\+", "\\-\\-"]),
//     ]),
//     parenExpression,
//     // TODO: postfix;
//     // $.seq([$.ref("unaryExpression"), unaryPostfixOperator]),
//     identifier,
//     Literal.anyLiteral,
//   ])
// );

const binaryExpression = $.def(
  NodeTypes.BinaryExpression,
  $.seq([
    // TODO: impl $.not() operator
    // Literal.anyLiteral,
    $.or([
      NodeTypes.UnaryExpression,
      $.seq([
        // binary!
        "\\(",
        _,
        NodeTypes.BinaryExpression,
        _,
        "\\)",
      ]),
    ]),
    // unaryExpression,
    // $.ref(ANY_EXPRESSION),
    $.repeat(
      $.seq(
        //
        [
          _,
          BINARY_OPS,
          _,
          $.or([
            NodeTypes.UnaryExpression,
            $.seq([
              // binary!
              "\\(",
              _,
              NodeTypes.BinaryExpression,
              _,
              "\\)",
            ]),
          ]),
        ]
      )
    ),
  ])
);

const unaryExpression = $.def(
  NodeTypes.UnaryExpression,
  $.seq([
    // unary prefix
    $.opt(
      $.or([
        "\\+\\+",
        "\\-\\-",
        "void\\s",
        "typeof\\s",
        "delete\\s",
        "\\~",
        "\\!",
      ])
    ),
    $.or([
      // parenExpression,
      // $.seq(["\\(", _, NodeTypes.UnaryExpression, _, "\\)"]),
      $.seq(["\\(", _, NodeTypes.UnaryExpression, _, "\\)"]),
      NodeTypes.CallExpression,
      NodeTypes.MemberExpression,
      ThisKeyword,
      Literal.anyLiteral,
    ]),
  ])
);

export const anyExpression = $.def(
  NodeTypes.AnyExpression,
  $.or([
    parenExpression,
    binaryExpression,
    unaryExpression,
    memberExpression,
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

  test("identExpression", () => {
    const parse = compile(identifier);
    assertSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1"]);
    assertError(parse, ["1", "1_", "const"]);
  });

  test("memberExpression", () => {
    const parse = compile(memberExpression);
    assertSame(parse, ["a.b", "a", "a.b.c", "a[1]"]);
  });

  test("callExpression", () => {
    const parse = compile($.seq([callExpression, $.eof()]));
    assertSame(parse, ["a().a()"]);
    assertSame(parse, ["a().a.b()"]);
  });

  // test("unaryExpr", () => {
  //   const parse = compile(unaryExpression);
  //   assertSame(parse, [
  //     "a",
  //     "++a",
  //     // "typeof a",
  //     // "typeof (a)",
  //     // "delete a",
  //     // "void a",
  //     // "--a",
  //   ]);
  //   // assertError(parse, ["1 +", "1 + +", "1 + + 1"]);
  // });

  test("functionExpression", () => {
    const parse = compile(functionExpression);
    is(parse("function () {}").result, "function () {}");
    is(parse("function (a,) {}").result, "function (a,) {}");
    is(parse("function (a,b) {}").result, "function (a,b) {}");
    is(parse("function ({a}) {}").result, "function ({a}) {}");

    // is(parse("func([])").result, "func([])");
    // is(parse("func(1,2)").result, "func(1,2)");
    // is(parse("func(1,2,)").result, "func(1,2,)");
  });

  test("callExpression", () => {
    const parse = compile(callExpression);
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
      "((1 + 1) + (1 * 2))",
    ]);
    // eq(parse("1 + 1").result, "1 + 1");
    // eq(parse("(1)").result, "(1)");
    // eq(parse("1").result, "1");
    // eq(parse("(1 + 1)").result, "(1 + 1)");
    // eq(parse("(1 + (1 * 2))").result, "(1 + (1 * 2))");
  });

  run({ stopOnFail: true, isMain });
}
