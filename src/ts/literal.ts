import { compile, builder as $ } from "./ctx";
import { _, __, NodeTypes, SYMBOL } from "./constants";

// export function defineLiteral($: Builder) {
export const stringLiteral = $.def(
  NodeTypes.StringLiteral,
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
export const numberLiteral = $.def(
  NodeTypes.NumberLiteral,
  `([0-9]|[1-9][0-9]*)`
);
export const booleanLiteral = $.def(NodeTypes.BooleanLiteral, `(true|false)`);
export const nullLiteral = $.def(NodeTypes.NullLiteral, `null`);
export const arrayLiteral = $.def(
  NodeTypes.ArrayLiteral,
  $.or([
    $.seq(
      [
        "\\[",
        _,
        $.param("head", $.ref(NodeTypes.AnyLiteral)),
        _,
        $.param(
          "tail",
          $.repeat(
            $.seq([
              // , item
              _,
              ",",
              _,
              $.param("item", $.ref(NodeTypes.AnyLiteral)),
            ]),
            undefined,
            (input) => {
              // throw input;
              return input.item;
            }
          )
        ),
        _,
        "\\]",
      ],
      ({ head, tail }) => {
        return {
          type: "array",
          values: [head, ...tail],
        };
      }
    ),
    $.seq(["\\[", _, "\\]"], () => ({ type: "array", values: [] })),
  ])
);

// key: val
const objectKeyPair = $.def(
  undefined,
  $.seq([
    _,
    // key: value
    $.param("key", $.or([stringLiteral, SYMBOL])),
    _,
    "\\:",
    _,
    $.param("value", $.ref(NodeTypes.AnyLiteral)),
  ])
);

// ref by key
export const objectLiteral = $.def(
  NodeTypes.ObjectLiteral,
  $.or([
    $.seq(
      [
        "\\{",
        _,
        $.param("head", objectKeyPair),
        $.param(
          "tail",
          $.repeat(
            $.seq([_, ",", $.param("item", objectKeyPair)]),
            undefined,
            (input) => input.item
          )
        ),
        _,
        "\\}",
      ],
      (input) => {
        return {
          type: "object",
          values: [input.head, ...input.tail],
        };
      }
    ),
    $.seq(["\\{", _, "\\}"], () => ({ type: "object", values: [] })),
  ])
);

export const anyLiteral = $.def(
  NodeTypes.AnyLiteral,
  $.or([
    objectLiteral,
    arrayLiteral,
    stringLiteral,
    numberLiteral,
    booleanLiteral,
    nullLiteral,
  ])
);

import { test, run, is } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  // const L = defineLiteral($);
  test("string", () => {
    const parseString = compile(stringLiteral);
    is(parseString('"hello"').result, '"hello"');
  });

  test("array", () => {
    const parseArray = compile(arrayLiteral);
    is(parseArray("[null]").result, {
      type: "array",
      values: ["null"],
    });
    is(parseArray("[ 1, 2 ]").result, {
      type: "array",
      values: ["1", "2"],
    });
  });
  test("json", () => {
    const parseExpression = compile(anyLiteral);
    is(
      parseExpression(`{  "a" : 1, "b": "text", "c" : true, "d": null }`)
        .result,
      {
        type: "object",
        values: [
          {
            key: '"a"',
            value: "1",
          },
          {
            key: '"b"',
            value: '"text"',
          },
          {
            key: '"c"',
            value: "true",
          },
          {
            key: '"d"',
            value: "null",
          },
        ],
      }
    );

    const jsonText = `{  "a": { "b": "2" }, c: {}, "d": [1], "e": [{} ] }`;
    is(parseExpression(jsonText).result, {
      type: "object",
      values: [
        {
          key: '"a"',
          value: {
            type: "object",
            values: [
              {
                key: '"b"',
                value: '"2"',
              },
            ],
          },
        },
        {
          key: "c",
          value: {
            type: "object",
            values: [],
          },
        },
        {
          key: '"d"',
          value: {
            type: "array",
            values: ["1"],
          },
        },
        {
          key: '"e"',
          value: {
            type: "array",
            values: [{ type: "object", values: [] }],
          },
        },
      ],
    });
  });

  run({ stopOnFail: true, stub: true, isMain });
}
