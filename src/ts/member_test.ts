import { compile, builder as $ } from "./ctx";
import * as Literal from "./literal";
import { NodeTypes, RESERVED_WORDS, _, __ } from "./constants";

const reserved = "(" + RESERVED_WORDS.join("|") + ")";

const ThisKeyword = $.tok("this");

const identifier = $.def(
  NodeTypes.Identifier,
  $.seq([
    // not reserved word
    $.not(reserved),
    // $.not("this"),
    "([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)",
  ])
);

// const property = $.def(undefined, $.or([identifier, Literal.anyLiteral]));

// for member access
const callAsIntermediateMember = $.def(
  // NodeTypes.CallExpression,
  undefined,
  $.seq([identifier, _, "\\(", _, "\\)"])
);

const callExpression = $.def(
  NodeTypes.CallExpression,
  $.seq([
    $.or([$.ref(NodeTypes.MemberAccessExpression), identifier]),
    _,
    "\\(",
    _,
    "\\)",
  ])
);

// const memberAccessExpression = $.def(
//   NodeTypes.MemberAccessExpression,
//   $.or([
//     // dot access
//     $.seq([$.repeat($.seq([lefthand, _, "(\\.|\\?\\.)"]), [1]), _, property]),
//   ])
// );

// recursive pattern
const unaryExpression = $.def(
  NodeTypes.UnaryExpression,
  $.or([$.ref(NodeTypes.MemberAccessExpression), identifier, ThisKeyword])
);

const memberLeft = $.or([ThisKeyword, callAsIntermediateMember, identifier]);
const memberRight = $.or([identifier]);
const memberAccessExpression = $.def(
  NodeTypes.MemberAccessExpression,
  $.seq([$.repeat($.seq([memberLeft, "\\."])), memberRight])
);

import { test, run, is, cancelAll } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  cancelAll();
  test("ident", () => {
    const parse = compile(identifier);
    is(parse("x").result, "x");
    is(parse("this"), { error: true });
  });

  test("memberIntermediate", () => {
    const parse = compile(
      $.seq([$.repeat($.seq([_, "\\.", _, memberLeft])), $.eof()])
    );
    is(parse(".a").result, ".a");
    is(parse(".a()").result, ".a()");
    is(parse(".a().b").result, ".a().b");
    is(parse(".a().b()").result, ".a().b()");
  });

  test("member", () => {
    const parse = compile($.seq([memberAccessExpression, $.eof()]));
    // console.log(JSON.stringify(parse("a.a"), null, 2));
    is(parse("a.a").result, "a.a");
    is(parse("a.b().c").result, "a.b().c");
    is(parse("this.a").result, "this.a");
    // this is not valid but other compiler inhibit this
    is(parse("this.this.a").result, "this.this.a");

    // is(parse("a.this"), {
    //   error: true,
    // });
    // is(parse("a.b()"), { error: true });
    // is(parse("a.b().c"), { result: "a.b().c" });
    // is(parse("a.b().c"), { result: "a.b().c" });
    // is(parse("a().a").result, "a().a");
    // is(parse("a().a().a").result, "a().a().a");
    // is(parse("a.a.a").result, "a.a.a");
    // is(parse("a[a]").result, "a[a]");
    // is(parse("a().a"), { result: "a().a" });
  });
  test("call", () => {
    const parse = compile(callExpression);
    is(parse("a()").result, "a()");
    // is(parse("a.a()").result, "a.a()");
    // is(parse("a.a()").result, "a.a()");
  });

  run({ stopOnFail: true, isMain });
}
