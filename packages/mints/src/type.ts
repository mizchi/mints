import { compile, builder as $ } from "./ctx";
import { REST_SPREAD, _, __ } from "./constants";

/* TypeExpression */
const typeDeclareParameter = $.def(() =>
  $.seq([
    typeExpression,
    // extends T
    $.opt($.seq([_, "extends", __, typeExpression])),
    _,
    $.opt($.seq(["\\=", _, typeExpression])),
  ])
);

// declare parameters
export const typeDeclareParameters = $.def(() =>
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
export const typeParameters = $.def(() =>
  $.seq([
    "\\<",
    _,
    $.repeat_seq([typeExpression, _, ",", _]),
    $.seq([typeExpression, _, ",?"]),
    _,
    "\\>",
  ])
);

const typeParen = $.def(() =>
  $.seq(["\\(", _, typeExpression, _, "\\)", _, $.opt(typeParameters)])
);

const typeIdentifier = $.def(() =>
  $.or([
    // type's reserved words
    "void",
    "any",
    "unknown",
    $.seq([identifier, _, $.opt(typeParameters)]),
  ])
);

const typePrimary = $.def(() =>
  $.or([typeParen, typeObjectLiteral, typeArrayLiteral, typeIdentifier])
);

const typeReference = $.def(() =>
  $.seq([
    typePrimary,
    $.repeat_seq([
      _,
      $.or([
        $.seq(["\\.", _, typeIdentifier]),
        $.seq(["\\[", $.opt(typeExpression), "\\]"]),
      ]),
    ]),
  ])
);

const _typeNameableItem = $.def(() =>
  $.or([
    $.seq([
      // start: number,
      identifier,
      _,
      "\\:",
      _,
      typeExpression,
      _,
    ]),
    typeExpression,
  ])
);

const typeArrayLiteral = $.def(() =>
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
        identifier,
        _,
        "\\:",
        _,
        typeExpression,
        // _,
      ]),
      _typeNameableItem,
      _,
    ]),
    _,
    "\\]",
  ])
);

const typeFunctionArgs = $.def(() =>
  $.seq([
    $.repeat_seq([
      // args
      identifier,
      _,
      "\\:",
      _,
      typeExpression,
      _,
      ",",
      _,
    ]),
    $.or([
      // last
      $.seq([REST_SPREAD, _, identifier, _, "\\:", _, typeExpression]),
      $.seq([identifier, _, "\\:", _, typeExpression, _, ",?"]),
      _,
    ]),
  ])
);

const _typeObjectItem = $.def(() =>
  $.or([
    $.seq([
      // async foo<T>(arg: any): void;
      $.opt($.seq(["async", __])),
      identifier,
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
      typeExpression,
    ]),
    // member
    $.seq([
      $.opt($.seq(["readonly", __])),
      identifier,
      _,
      "\\:",
      _,
      typeExpression,
    ]),
  ])
);

export const typeObjectLiteral = $.def(() =>
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
  stringLiteral,
  numberLiteral,
  // TODO: rewrite template literal for typeExpression
  templateLiteral,
  booleanLiteral,
  nullLiteral,
]);

const typeFunctionExpression = $.def(() =>
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
    typeExpression,
  ])
);

const typeUnaryExpression = $.def(() =>
  $.seq([
    $.opt($.seq(["(keyof|typeof|infer)", __])),
    $.or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
    // generics parameter
  ])
);

const typeBinaryExpression = $.def(() =>
  $.seq([
    $.repeat_seq([typeUnaryExpression, _, $.or(["\\|", "\\&"]), _]),
    typeUnaryExpression,
  ])
);

export const typeExpression = $.def(() => $.or([typeBinaryExpression]));

import { test, run, is, cancelAll } from "@mizchi/test";
import { expectError, expectSame, formatError } from "./_testHelpers";
import {
  booleanLiteral,
  identifier,
  nullLiteral,
  numberLiteral,
  stringLiteral,
  templateLiteral,
} from "./expression";
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
