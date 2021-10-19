import { compile, builder as $ } from "./ctx";
// import * as Literal from "./literal";
import { NodeTypes as T, REST_SPREAD, _, __ } from "./constants";

/* TypeExpression */

const typeDeclareParameter = $.seq([
  T.TypeExpression,
  // extends T
  $.opt($.seq([_, "extends", __, T.TypeExpression])),
  _,
  // = any
  $.opt($.seq(["\\=", _, T.TypeExpression])),
]);

// declare parameters
const typeDeclareParameters = $.def(
  T.TypeDeclareParameters,
  $.seq([
    "\\<",
    _,
    $.repeat_seq([typeDeclareParameter, _, ",", _]),
    $.seq([typeDeclareParameter, _, ",?"]),
    _,
    "\\>",
  ])
);

// apply parameters
const typeParameters = $.def(
  T.TypeParameters,
  $.seq([
    "\\<",
    _,
    $.repeat_seq([T.TypeExpression, _, ",", _]),
    $.seq([T.TypeExpression, _, ",?"]),
    _,
    "\\>",
  ])
);

const typeParen = $.seq([
  "\\(",
  _,
  T.TypeExpression,
  _,
  "\\)",
  _,
  $.opt(typeParameters),
]);

const typeIdentifier = $.def(
  T.TypeIdentifier,
  $.or([
    // type's reserved words
    "void",
    "any",
    "unknown",
    $.seq([T.Identifier, _, $.opt(T.TypeParameters)]),
  ])
);

const typePrimary = $.or([
  T.TypeObjectLiteral,
  T.TypeArrayLiteral,
  typeIdentifier,
]);

const typeReference = $.def(
  T.TypeReference,
  $.seq([
    typePrimary,
    $.repeat_seq([
      _,
      $.or([
        $.seq(["\\.", _, typeIdentifier]),
        $.seq(["\\[", $.opt(T.TypeExpression), "\\]"]),
      ]),
    ]),
  ])
);

const _typeNameableItem = $.or([
  $.seq([
    // start: number,
    T.Identifier,
    _,
    "\\:",
    _,
    T.TypeExpression,
    _,
  ]),
  T.TypeExpression,
]);

const typeArrayLiteral = $.def(
  T.TypeArrayLiteral,
  $.seq([
    // array
    "\\[",
    _,
    // repeat
    $.repeat_seq([_typeNameableItem, _, ",", _]),
    _,
    // optional last
    $.or([
      $.seq([
        // ...args: any
        REST_SPREAD,
        _,
        T.Identifier,
        _,
        "\\:",
        _,
        T.TypeExpression,
        // _,
      ]),
      _typeNameableItem,
      _,
    ]),
    _,
    "\\]",
  ])
);

const _typeObjectItem = $.or([
  // $.seq([T.Identifier, _, "\\:", _, T.TypeExpression]),
  $.seq([T.Identifier, _, "\\:", _, T.TypeExpression]),
]);

const typeObjectLiteral = $.def(
  T.TypeObjectLiteral,
  $.seq([
    // object
    "\\{",
    _,
    $.repeat_seq([_typeObjectItem, _, "(,|;)", _]),
    $.opt(_typeNameableItem),
    _,
    "(,|;)?",
    _,
    "\\}",
  ])
);

const typeLiteral = $.or([
  typeObjectLiteral,
  typeArrayLiteral,
  T.StringLiteral,
  T.NumberLiteral,
  // TODO: rewrite template literal for typeExpression
  T.TemplateLiteral,
  T.BooleanLiteral,
  T.NullLiteral,
]);

const typeFunctionArgs = $.seq([
  $.repeat_seq([
    // args
    T.Identifier,
    _,
    "\\:",
    _,
    typeDeclareParameter,
    _,
    ",",
    _,
  ]),
  $.or([
    // last
    $.seq([REST_SPREAD, _, T.Identifier, _, "\\:", _, T.TypeExpression]),
    $.seq([T.Identifier, _, "\\:", _, T.TypeExpression, _, ",?"]),
    _,
  ]),
]);

const typeFunctionExpression = $.def(
  T.TypeFunctionExpression,
  $.seq([
    // function
    $.opt(typeDeclareParameters),
    _,
    "\\(",
    _,
    typeFunctionArgs,
    _,
    "\\)",
    _,
    "\\=\\>",
    _,
    // return type
    T.TypeExpression,
    // $.repeat_seq([_typeObjectItem, _, "(,|;)", _]),
    // $.opt(_typeNameableItem),
    // _,
    // "(,|;)?",
    // _,
    // "\\}",
  ])
);

const typeUnaryExpression = $.def(
  T.TypeUnaryExpression,
  $.seq([
    $.opt($.seq(["(keyof|typeof|infer)", __])),
    $.or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
    // generics parameter
  ])
);

const typeBinaryExpression = $.def(
  T.TypeBinaryExpression,
  $.seq([
    $.repeat_seq([typeUnaryExpression, _, $.or(["\\|", "\\&"]), _]),
    typeUnaryExpression,
  ])
);

export const typeExpression = $.def(
  T.TypeExpression,
  $.or([typeBinaryExpression])
);

import { test, run, is, cancelAll } from "@mizchi/test";
import { expectError, expectSame, formatError } from "./_testHelpers";
const isMain = require.main === module;

if (process.env.NODE_ENV === "test") {
  require("./expression");
  require("./statements");
  // cancelAll();
  test("typeExpression", () => {
    const parse = compile(typeExpression, { end: true });
    // const parse = compile(asExpression, { end: true });
    expectSame(parse, [
      "number",
      "number[]",
      "number[] | c",
      "number[][]",
      "1",
      "'x'",
      "true",
      "null",
      "`${number}`",
      "Array<T>",
      "Map<string, number>",
      "Array<Array<T[]>>",
      "X<Y>[]",
      "React.ReactNode",
      "React.ChangeEvent<T>",
      "X.Y.Z",
      "keyof T",
      "T['K']",
      "T['K']['X']",
      "T['K']['X'].val",
      "string",
      "a | b",
      "a | b | c",
      "a & b",
      "a & b & c",
      "(a)",
      "(a) | (b)",
      "(a & b) & c",
      "{}",
      "typeof A",
      "{ a: number; }",
      "{ a: number, }",
      "{ a: number, b: number }",
      "{ a: number, b: { x: 1; } }",
      "{ a: number; }['a']",
      "[] & {}",
      "[number]",
      "[number,number]",
      "[number, ...args: any]",
      "[a:number]",
      "[y:number,...args: any]",
      "() => void",
      "<T>() => void",
      "<T = U>() => void",
      "<T extends X>() => void",
      "<T extends X = any>() => void",
      "(a: number) => void",
      "(a: A) => void",
      "(a: A, b: B) => void",
      "(...args: any[]) => void",
      "(...args: any[]) => A | B",
      "infer U",
    ]);
  });
  run({ stopOnFail: true, stub: true, isMain });
}
