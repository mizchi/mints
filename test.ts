// @ts-ignore
import { test, run } from "@mizchi/testio/dist/testio.cjs";
import assert from "assert";

import { compile, $ } from "./src/index";

test("expr", () => {
  const parse = compile($.expr("a"));
  assert.equal(parse("a"), "a");
  assert.equal(parse("b"), undefined);
});

test("expr with reshape", () => {
  const parse = compile($.expr("a", (x) => ({ x: x })));
  assert.deepStrictEqual(parse("a"), { x: "a" });
  assert.equal(parse("b"), undefined);
});

test("seq", () => {
  const expr = $.seq([$.expr("a")]);
  const parse = compile(expr);
  const parsed = parse("a");
  assert.deepStrictEqual(parsed, "a");
});

test("seq with name", () => {
  const parse = compile($.seq([$.param("a", $.expr("a"))]));
  const parsed = parse("a");
  assert.deepStrictEqual(parsed, { a: "a" });
});

test("repeat", () => {
  const parse = compile($.repeat($.expr("\\w")));
  const parsed = parse("aa");
  assert.deepStrictEqual(parsed, ["a", "a"]);
});

test("repeat with param", () => {
  const parse = compile($.repeat($.seq([$.param("v", $.expr("\\w"))])));
  const parsed = parse("aa");
  assert.deepStrictEqual(parsed, [{ v: "a" }, { v: "a" }]);
});

test("or", () => {
  const parse = compile($.or([$.expr("a"), $.expr("b")]));
  assert.deepStrictEqual(parse("b"), "b");
  assert.deepStrictEqual(parse("a"), "a");
  assert.deepStrictEqual(parse("c"), null);
});

test("or-literal", () => {
  const parse = compile(
    $.or([
      $.expr("\\d+", (input) => ({ type: "number", value: Number(input) })),
      $.expr("[a-z]+", (input) => ({ type: "string", value: input })),
    ])
  );
  assert.deepStrictEqual(parse("c"), { type: "string", value: "c" });
});

test("object-literal", () => {
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
  assert.deepStrictEqual(parse(`{ a: 1, b: 2, c: "xxx", d: true }`), [
    { key: "a", val: { type: "number", value: 1 } },
    { key: "b", val: { type: "number", value: 2 } },
    { key: "c", val: { type: "string", value: "xxx" } },
    { key: "d", val: { type: "boolean", value: true } },
  ]);
});

run({});
