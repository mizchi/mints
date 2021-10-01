import { createContext } from "./index";

import assert from "assert";

import type { Builder } from "./index";
import { _, __ } from "./constants";

export function defineLiteral($: Builder) {
  const stringLiteral = $.def(
    "stringLiteral",
    $.or([
      // double quote
      `("[^"\\n]*")`,
      // single
      `('[^'\\n]*')`,
      // backtick
      "(`[^`]*`)",
    ])
  );

  const ident = $.def("ident", "([a-zA-Z_$][a-zA-Z0-9_$]*)");
  const numberLiteral = $.def("numberLiteral", `([0-9]|[1-9][0-9]*)`);
  const booleanLiteral = $.def("booleanLiteral", `(true|false)`);
  const nullLiteral = $.def("nullLiteral", `null`);
  const arrayLiteral = $.def(
    "arrayLiteral",
    $.or([
      $.seq(
        [
          "\\[",
          _,
          $.param("head", $.ref("anyLiteral")),
          _,
          $.param(
            "tail",
            $.repeat(
              $.seq([
                // , item
                _,
                ",",
                _,
                $.param("item", $.ref("anyLiteral")),
              ]),
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
    "keypair",
    $.seq([
      _,
      // key: value
      $.param("key", $.or([stringLiteral, ident])),
      _,
      "\\:",
      _,
      $.param("value", $.ref("anyLiteral")),
    ])
  );

  // ref by key
  const objectLiteral = $.def(
    "objectLiteral",
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
  const anyLiteral = $.def(
    "anyLiteral",
    $.or([
      objectLiteral,
      arrayLiteral,
      stringLiteral,
      numberLiteral,
      booleanLiteral,
      nullLiteral,
    ])
  );
  return {
    anyLiteral,
    stringLiteral,
    numberLiteral,
    booleanLiteral,
    nullLiteral,
    arrayLiteral,
    objectLiteral,
    objectKeyPair,
  };
}

// @ts-ignore
import { test, run } from "@mizchi/testio/dist/testio.cjs";
if (process.env.NODE_ENV === "test" && require.main === module) {
  const { compile, builder: $ } = createContext();

  // @ts-ignore
  const eq = (...args: any[]) => assert.deepStrictEqual(...(args as any));

  const L = defineLiteral($);

  test("string", () => {
    const parseString = compile(L.stringLiteral);
    eq(parseString('"hello"').result, '"hello"');
  });

  test("array", () => {
    const parseArray = compile(L.arrayLiteral);
    assert.deepStrictEqual(parseArray("[null]").result, {
      type: "array",
      values: ["null"],
    });
    assert.deepStrictEqual(parseArray("[ 1, 2 ]").result, {
      type: "array",
      values: ["1", "2"],
    });
  });
  test("json", () => {
    const parseExpression = compile(L.anyLiteral);
    assert.deepStrictEqual(
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
    assert.deepStrictEqual(parseExpression(jsonText).result, {
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

  run({ stopOnFail: true, stub: true });
}
