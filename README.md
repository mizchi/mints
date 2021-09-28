# @mizchi/flat-pargen

simple parser generator based on regexp groups.

```bash
$ npm install @mizchi/idb-ops --save
# or
$ yarn add @mizchi/idb-ops
```

## How to use

```ts
import {compile, $} from "@mizchi/flat-pargen";

// whitespace
const _ = $.expr("\\s*");

const anyLiteral = $.or([
  $.expr("\\d+", (input) => ({ type: "number", value: Number(input) })),
  $.expr("true|false", (input) => ({
    type: "boolean",
    value: Boolean(input),
  })),
  $.expr(`"[^"]*"`, (input) => ({
    type: "string",
    value: input.slice(1, -1),
  })),
]);

const keyPairSeq = [
  $.param("key", $.expr("\\w+")),
  _,
  $.expr("\\:"),
  _,
  $.param("val", anyLiteral as any),
];
const parse = compile(
  $.seq(
    [
      $.expr("\\{"),
      _,
      $.param("head", $.seq(keyPairSeq)),
      $.param<any>(
        "tail",
        $.repeat(
          $.seq([
            // , a: b
            _,
            $.expr(","),
            _,
            ...keyPairSeq,
            _,
          ])
        )
      ),
      _,
      $.expr("\\}"),
    ],
    (input: any) => {
      return [input.head, ...input.tail];
    }
  )
);
console.log(parse(`{ a: 1, b: 2, c: "xxx", d: true }`);
// [
//   { key: "a", val: { type: "number", value: 1 } },
//   { key: "b", val: { type: "number", value: 2 } },
//   { key: "c", val: { type: "string", value: "xxx" } },
//   { key: "d", val: { type: "boolean", value: true } },
// ];

```


## LICENSE

MIT


