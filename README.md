# @mizchi/pargen

hobby parser generator

```bash
$ npm install @mizchi/pargen --save
# or
$ yarn add @mizchi/pargen
```

Size

```
dist/index.js   3.79 KiB / brotli: 1.57 KiB
dist/index.cjs   3.92 KiB / brotli: 1.59 KiB
```

## How to use

```ts
// json parser example
import {createContext} from "@mizchi/pargen";

const { compile, builder: $ } = createContext();

const _ = $.def("_", "\\s*");
const stringLiteral = $.def("stringLiteral", `"[^"]"`);
const numberLiteral = $.def("numberLiteral", `[0-9]|[1-9][0-9]*`);
const booleanLiteral = $.def("booleanLiteral", `true|false`);
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
    $.param("key", stringLiteral),
    _,
    "\\:",
    _,
    $.param("value", $.ref("anyLiteral")),
  ])
);

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

// test array
const parseArray = compile(arrayLiteral);
assert.deepStrictEqual(parseArray("[1]").result, {
  type: "array",
  values: ["1"],
});

assert.deepStrictEqual(parseArray("[1,2, {}]").result, {
  type: "array",
  values: ["1", "2", { type: "object", values: [] }],
});

// test as literal
const parseExpression = compile(anyLiteral);
assert.deepStrictEqual(
  parseExpression(`{  "a" : "1", "b": "2", "c" : true, "d": null }`).result,
  {
    type: "object",
    values: [
      {
        key: '"a"',
        value: '"1"',
      },
      {
        key: '"b"',
        value: '"2"',
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
```


## LICENSE

MIT


