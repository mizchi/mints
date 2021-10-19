import { compile, builder as $ } from "./ctx";
// import * as Literal from "./literal";
import {
  BooleanLiteral,
  Identifier,
  NullLiteral,
  NumberLiteral,
  REST_SPREAD,
  StringLiteral,
  TemplateLiteral,
  TypeArrayLiteral,
  TypeBinaryExpression,
  TypeDeclareParameters,
  TypeExpression,
  TypeFunctionExpression,
  TypeIdentifier,
  TypeObjectLiteral,
  TypeParameters,
  TypeReference,
  TypeUnaryExpression,
  _,
  __,
} from "./constants";

/* TypeExpression */

const typeDeclareParameter = $.seq([
  TypeExpression,
  // extends T
  $.opt($.seq([_, "extends", __, TypeExpression])),
  _,
  // = any
  $.opt($.seq(["\\=", _, TypeExpression])),
]);

// declare parameters
const typeDeclareParameters = $.def(TypeDeclareParameters, () =>
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
const typeParameters = $.def(TypeParameters, () =>
  $.seq([
    "\\<",
    _,
    $.repeat_seq([TypeExpression, _, ",", _]),
    $.seq([TypeExpression, _, ",?"]),
    _,
    "\\>",
  ])
);

const typeParen = $.seq([
  "\\(",
  _,
  TypeExpression,
  _,
  "\\)",
  _,
  $.opt(typeParameters),
]);

const typeIdentifier = $.def(TypeIdentifier, () =>
  $.or([
    // type's reserved words
    "void",
    "any",
    "unknown",
    $.seq([Identifier, _, $.opt(TypeParameters)]),
  ])
);

const typePrimary = $.or([
  typeParen,
  TypeObjectLiteral,
  TypeArrayLiteral,
  typeIdentifier,
]);

const typeReference = $.def(TypeReference, () =>
  $.seq([
    typePrimary,
    $.repeat_seq([
      _,
      $.or([
        $.seq(["\\.", _, typeIdentifier]),
        $.seq(["\\[", $.opt(TypeExpression), "\\]"]),
      ]),
    ]),
  ])
);

const _typeNameableItem = $.or([
  $.seq([
    // start: number,
    Identifier,
    _,
    "\\:",
    _,
    TypeExpression,
    _,
  ]),
  TypeExpression,
]);

const typeArrayLiteral = $.def(TypeArrayLiteral, () =>
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
        Identifier,
        _,
        "\\:",
        _,
        TypeExpression,
        // _,
      ]),
      _typeNameableItem,
      _,
    ]),
    _,
    "\\]",
  ])
);

const typeFunctionArgs = $.seq([
  $.repeat_seq([
    // args
    Identifier,
    _,
    "\\:",
    _,
    TypeExpression,
    _,
    ",",
    _,
  ]),
  $.or([
    // last
    $.seq([REST_SPREAD, _, Identifier, _, "\\:", _, TypeExpression]),
    $.seq([Identifier, _, "\\:", _, TypeExpression, _, ",?"]),
    _,
  ]),
]);

const _typeObjectItem = $.or([
  $.seq([
    // async foo<T>(arg: any): void;
    $.opt($.seq(["async", __])),
    Identifier,
    _,
    $.opt(typeDeclareParameters),
    _,
    "\\(",
    _,
    typeFunctionArgs,
    _,
    "\\)",
    _,
    "\\:",
    _,
    TypeExpression,
  ]),
  // member
  $.seq([
    $.opt($.seq(["readonly", __])),
    Identifier,
    _,
    "\\:",
    _,
    TypeExpression,
  ]),
]);

const typeObjectLiteral = $.def(TypeObjectLiteral, () =>
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
  StringLiteral,
  NumberLiteral,
  // TODO: rewrite template literal for typeExpression
  TemplateLiteral,
  BooleanLiteral,
  NullLiteral,
]);

const typeFunctionExpression = $.def(TypeFunctionExpression, () =>
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
    TypeExpression,
  ])
);

const typeUnaryExpression = $.def(TypeUnaryExpression, () =>
  $.seq([
    $.opt($.seq(["(keyof|typeof|infer)", __])),
    $.or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
    // generics parameter
  ])
);

const typeBinaryExpression = $.def(TypeBinaryExpression, () =>
  $.seq([
    $.repeat_seq([typeUnaryExpression, _, $.or(["\\|", "\\&"]), _]),
    typeUnaryExpression,
  ])
);

export const typeExpression = $.def(TypeExpression, () =>
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
      "{ a: () => void; }",
      "{ f(): void; }",
      "{ async f(): void; }",
      "{ f(arg: any): void; }",
      "{ f(arg: any,): void; }",
      "{ f(a1: any, a2: any): void; }",
      "{ f(a1: any, a2: any, ...args: any): void; }",
      "{ f(...args: any): void; }",
      "{ f(...args: any): void; b: 1; }",
      "{ readonly b: number; }",
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
      "((...args: any[]) => A | B) | () => void",
      "infer U",
    ]);
  });
  run({ stopOnFail: true, stub: true, isMain });
}
