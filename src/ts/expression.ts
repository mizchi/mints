// import "./type";
import { compile, builder as $ } from "./ctx";
// import * as Literal from "./literal";
import {
  OPERATORS,
  NodeTypes as T,
  RESERVED_WORDS,
  _,
  __,
  REST_SPREAD,
} from "./constants";

// const reserved = "(" + RESERVED_WORDS.join("|") + ")";
const identifier = $.def(
  T.Identifier,
  $.seq([`(?!${RESERVED_WORDS.join("|")})`, "([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)"])
);

const ThisKeyword = $.tok("this");
const ImportKeyword = $.tok("import");
const BINARY_OPS = "(" + OPERATORS.join("|") + ")";

/*
  patterns
*/

// Destructive Pattren
// TODO: Array
const destructiveArrayPattern = $.def(
  T.DestructiveArrayPattern,
  $.seq([
    "\\[",
    _,
    $.repeat_seq([$.opt(T.DestructivePattern), _, ",", _]),
    _,
    $.or([
      $.seq([REST_SPREAD, _, identifier]),
      $.opt<any>(T.DestructivePattern),
      _,
    ]),
    _,
    ",?",
    _,
    "\\]",
  ])
);

const destructiveObjectItem = $.or([
  $.seq([
    // a : b
    identifier,
    _,
    $.opt($.seq(["\\:", _, T.DestructivePattern])),
    // a: b = 1,
    $.opt($.seq([_, "=", _, T.AnyExpression])),
  ]),
]);

const destructiveObjectPattern = $.def(
  T.DestructiveObjectPattern,
  $.seq([
    "\\{",
    _,
    $.repeat_seq([destructiveObjectItem, _, ",", _]),
    $.or([$.seq([REST_SPREAD, _, identifier]), destructiveObjectItem, _]),
    _,
    "\\}",
  ])
);

const destructivePattern = $.def(
  T.DestructivePattern,
  $.seq([
    $.or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    $.opt($.seq([_, "=", _, T.AnyExpression])),
  ])
);

const lefthand = $.def(T.Argument, destructivePattern);

const _typeAnnotation = $.seq([":", _, T.TypeExpression]);

const functionArguments = $.def(
  T.Arguments,
  $.seq([
    $.repeat_seq([lefthand, _, $.skip_opt(_typeAnnotation), _, ","]),
    _,
    $.or([
      // rest spread
      $.seq([REST_SPREAD, _, identifier, _, $.skip_opt(_typeAnnotation)]),
      $.seq([lefthand, _, $.skip_opt(_typeAnnotation)]),
      _,
    ]),
  ])
);

const callArguments = $.seq([
  $.repeat_seq([T.AnyExpression, _, ","]),
  _,
  $.or([
    // rest spread
    $.seq([REST_SPREAD, _, T.AnyExpression]),
    T.AnyExpression,
    _,
  ]),
]);

/* Expression */

const stringLiteral = $.def(
  T.StringLiteral,
  $.or([
    // double quote
    `("[^"\\n]*")`,
    // single
    `('[^'\\n]*')`,
  ])
);

const nonBacktickChars = "[^`]*";

const templateLiteral = $.def(
  T.TemplateLiteral,
  $.seq([
    "`",
    // aaa${}
    $.repeat_seq([nonBacktickChars, "\\$\\{", _, T.AnyExpression, _, "\\}"]),
    nonBacktickChars,
    "`",
  ])
);

const regexpLiteral = $.def(
  T.RegExpLiteral,
  $.seq(["\\/[^\\/]+\\/([igmsuy]*)?"])
);

// TODO: 111_000
// TODO: 0b1011
const numberLiteral = $.def(
  T.NumberLiteral,
  $.or([
    // 16
    `(0(x|X)[0-9a-fA-F]+)`,
    // 8
    `(0(o|O)[0-7]+)`,
    // 2
    `(0(b|B)[0-1]+)`,
    // decimal
    `([1-9][0-9_]*\\.\\d+|[1-9][0-9_]*|\\d)(e\\-?\\d+)?`,
  ])
);

const booleanLiteral = $.def(T.BooleanLiteral, `(true|false)`);
const nullLiteral = $.def(T.NullLiteral, `null`);

const restSpread = $.seq([REST_SPREAD, _, T.AnyExpression]);

const arrayLiteral = $.def(
  T.ArrayLiteral,
  $.or([
    $.seq([
      "\\[",
      $.repeat(
        $.seq([
          // , item
          _,
          $.opt(T.AnyExpression),
          _,
          ",",
        ])
      ),
      _,
      $.or([$.opt<any>(restSpread), T.AnyExpression, _]),
      _,
      "\\]",
    ]),
  ])
);

// key: val
const objectItem = $.or([
  $.seq([
    // function
    "((async|get|set)\\s+)?",
    $.or([
      stringLiteral,
      $.seq(["\\[", _, T.AnyExpression, _, "\\]"]),
      identifier,
    ]),
    $.seq([_, "\\(", _, functionArguments, _, "\\)", _, T.Block]),
  ]),
  $.seq([
    // value
    $.or([
      stringLiteral,
      $.seq(["\\[", _, T.AnyExpression, _, "\\]"]),
      identifier,
    ]),
    // value or shorthand
    $.seq([_, "\\:", _, T.AnyExpression]),
  ]),
  identifier,
]);

// ref by key
const objectLiteral = $.def(
  T.ObjectLiteral,
  $.seq([
    "\\{",
    $.repeat($.seq([_, objectItem, _, ","])),
    _,
    $.or([$.opt<any>(restSpread), objectItem, _]),
    _,
    "\\}",
  ])
);

const anyLiteral = $.def(
  T.AnyLiteral,
  $.or([
    objectLiteral,
    arrayLiteral,
    stringLiteral,
    templateLiteral,
    regexpLiteral,
    numberLiteral,
    booleanLiteral,
    nullLiteral,
  ])
);

/* Class */
const accessModifier = "(private|public|protected)\\s+";
const staticModifier = "static\\s+";
const asyncModifier = "async\\s+";

const classField = $.or([
  $.seq([
    $.skip_opt(accessModifier),
    "constructor",
    _,
    "\\(",
    _,
    functionArguments,
    _,
    "\\)",
    _,
    T.Block,
  ]),
  // class member
  $.seq([
    $.skip_opt(accessModifier),
    `(${staticModifier})?`,
    `(${asyncModifier})?`,
    "\\*?", // generator
    "\\#?", // private
    identifier,
    // <T>
    $.skip_opt($.seq([_, T.TypeDeclareParameters])),
    _,
    $.seq([
      // foo(): void {}
      "\\(",
      _,
      functionArguments,
      _,
      "\\)",
      $.skip_opt($.seq([_, _typeAnnotation])),
      _,
      T.Block,
    ]),
  ]),
  // field
  $.seq([
    $.skip_opt(accessModifier),
    `(${staticModifier})?`,
    $.opt("\\#"),
    identifier,
    $.skip_opt($.seq([_, _typeAnnotation])),
    _,
    $.opt($.seq(["=", _, T.AnyExpression])),
    ";",
  ]),
]);

const classExpression = $.def(
  T.ClassExpression,
  $.seq([
    $.skip_opt($.seq(["abstract", __])),
    "class",
    $.opt($.seq([__, identifier])),
    // <T>
    $.skip_opt(T.TypeDeclareParameters),
    $.opt($.seq([__, "extends", __, T.AnyExpression])),
    $.skip_opt($.seq([__, "implements", __, T.TypeExpression])),
    _,
    "\\{",
    _,
    $.repeat_seq([_, classField, _]),
    _,
    // TODO: class field
    "\\}",
  ])
);

const functionExpression = $.def(
  T.FunctionExpression,
  $.seq([
    $.opt(asyncModifier),
    "function",
    _,
    "(\\*)?\\s+", // generator
    $.opt(identifier),
    _,
    $.skip_opt(T.TypeDeclareParameters),
    _,
    "\\(",
    _,
    functionArguments,
    _,
    "\\)",
    _,
    $.skip_opt(_typeAnnotation),
    _,
    $.or([T.Block, T.AnyStatement]),
  ])
);

const arrowFunctionExpression = $.def(
  T.ArrowFunctionExpression,
  $.seq([
    $.opt(asyncModifier),
    $.skip_opt(T.TypeDeclareParameters),
    _,
    "(\\*)?",
    _,
    $.or([
      $.seq([
        "\\(",
        _,
        functionArguments,
        _,
        "\\)",
        $.skip_opt($.seq([_, _typeAnnotation])),
      ]),
      identifier,
    ]),
    _,
    "\\=\\>",
    _,
    $.or([T.Block, T.AnyStatement]),
  ])
);

const newExpression = $.seq([
  "new",
  __,
  T.MemberExpression,
  _,
  $.opt($.seq(["\\(", functionArguments, "\\)"])),
]);

const paren = $.seq(["\\(", _, T.AnyExpression, _, "\\)"]);
const primary = $.or([
  paren,
  newExpression,
  ImportKeyword,
  ThisKeyword,
  identifier,
]);

const __call = $.or([
  $.seq([
    "\\?\\.",
    $.skip_opt($.seq([_, T.TypeParameters])),
    _,
    "\\(",
    _,
    callArguments,
    _,
    "\\)",
  ]),
  $.seq([
    $.skip_opt($.seq([_, T.TypeParameters])),
    _,
    "\\(",
    _,
    callArguments,
    _,
    "\\)",
  ]),
]);

const memberAccess = $.or([
  // ?. | .#a | .a
  $.seq(["(\\?)?\\.", "\\#?", identifier]),
  $.seq(["(\\?\\.)?", "\\[", _, T.AnyExpression, _, "\\]"]),
  __call,
]);

const memberable = $.def(
  T.MemberExpression,
  $.or([$.seq([primary, $.repeat(memberAccess)]), anyLiteral])
);

// call chain access and member access
const accessible = $.def(
  T.CallExpression,
  $.or([
    // call chain
    $.seq([memberable, _, __call, _, $.repeat_seq([memberAccess])]),
    memberable,
  ])
);

const unary = $.def(
  T.UnaryExpression,
  $.or([
    // with unary prefix
    $.seq([
      $.or([
        "\\+\\+",
        "\\-\\-",
        "void ",
        "typeof ",
        "delete ",
        "await ",
        "\\~",
        "\\!",
      ]),
      T.UnaryExpression,
    ]),
    $.seq([$.or([accessible, paren]), templateLiteral]),
    $.seq([
      $.or([
        classExpression,
        functionExpression,
        arrowFunctionExpression,
        accessible,
        paren,
      ]),
      $.opt($.or(["\\+\\+", "\\-\\-"])),
      // ts bang operator
      $.skip_opt("\\!"),
    ]),
  ])
);

const binaryExpression = $.def(
  T.BinaryExpression,
  $.seq([unary, $.repeat_seq([_, BINARY_OPS, _, unary])])
);

/* TypeExpression */

const asExpression = $.def(
  T.AsExpression,
  $.seq([
    // foo as Type
    binaryExpression,
    $.skip_opt<any>($.seq([__, "as", __, T.TypeExpression])),
  ])
);

export const anyExpression = $.def(T.AnyExpression, asExpression);

import { test, run, is } from "@mizchi/test";
import { expectError, expectSame } from "./_testHelpers";

const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  // require statements initialize for block
  require("./statements");
  require("./type");

  test("string", () => {
    const parse = compile(stringLiteral, { end: true });
    expectSame(parse, ["''", `""`, '"hello"', `'hello'`]);
    expectError(parse, [`"a\nb"`]);
  });

  test("template", () => {
    const parse = compile(templateLiteral, { end: true });
    expectSame(parse, [
      "``",
      "`x`",
      "`x\nx`",
      "`${a}`",
      "`x${a}`",
      "`${a}_${b}_c`",
    ]);
  });

  test("RegExp", () => {
    const parse = compile(regexpLiteral);
    expectSame(parse, ["/hello/", "/hello/i", "/hello/gui"]);
    expectError(parse, ["//"]);
  });

  test("number", () => {
    const parse = compile(numberLiteral);
    expectSame(parse, [
      "1",
      "11",
      "11.1e5",
      "1.1",
      "111_111",
      "0xfff",
      "0x435",
      "0b1001",
    ]);
    // expectError(parse, ["0o8", "0b2"]);
  });

  test("array", () => {
    const parseArray = compile(arrayLiteral);
    expectSame(parseArray, [
      "[]",
      "[  ]",
      "[,,]",
      "[,,a]",
      "[,a,]",
      "[1,2]",
      "[1, a, {}]",
      "[...a]",
      "[a,...b]",
      "[,...b]",
      "[a,]",
    ]);
  });

  test("object", () => {
    const parseExpression = compile(anyLiteral);
    expectSame(parseExpression, [
      `{}`,
      `{ a: 1 }`,
      `{ a: 1, b: 2}`,
      `{ a: 1, b: 2,}`,
      `{ a: 1, b: 2, ...rest}`,
      `{ a }`,
      `{ a,b }`,
      `{ [1]: 1 }`,
      `{ a() {} }`,
      `{ [1]() {} }`,
      `{ async a(){} }`,
      `{ get a() {} }`,
      `{ set a() {} }`,
      `{ get 'aaa'() {} }`,
      `{ "a" : 1, "b": "text", "c" : true, "d": null }`,
      `{ "a": { "b": "2" }, c: {}, "d": [1], "e": [{} ] }`,
    ]);
    expectError(parseExpression, [`{ async a: 1 }`, `{ async get a() {} }`]);
  });

  test("identifier", () => {
    const parse = compile(identifier);
    expectSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1"]);
    expectError(parse, ["1", "1_", "const", "public"]);
  });

  test("newExpression", () => {
    const parse = compile(newExpression, { end: true });
    expectSame(parse, ["new X()", "new X[1]()", "new X.Y()"]);
  });

  test("memberExpression", () => {
    const parse = compile(memberable, { end: true });
    expectSame(parse, [
      "a.b",
      "a",
      "a.b.c",
      "a[1]",
      "new X().b",
      "a?.b",
      "this.#a",
      "a?.[x]",
      "import.meta",
    ]);
    expectError(parse, ["a.new X()", "a.this", "(a).(b)"]);
  });

  test("unaryExpression", () => {
    const parse = compile(unary);
    expectSame(parse, [
      "typeof x",
      "await x",
      "void x",
      "++x",
      "--x",
      "~x",
      "!x",
      "~~x",
      "!!x",
      "++x++",
    ]);
    // expectError(parse, ["a.new X()", "a.this"]);
  });

  test("callExpression", () => {
    const parse = compile($.seq([accessible, $.eof()]));
    expectSame(parse, ["a().a()", "import('aaa')"]);
    expectSame(parse, ["a().a.b()", "new X().b()"]);
  });

  test("functionExpression", () => {
    const parse = compile(functionExpression);
    expectSame(parse, [
      "function () {}",
      "function * () {}",
      "async function ({a}) 1",
      "function (a) {}",
      "function (a,) {}",
      "function (a,b) {}",
      "function ({a, b}) {}",
      "function ({a, b}) return 1",
      "function ({a}) 1",
      "function f() 1",
    ]);
    // drop types
    is(parse("function f() {}"), { result: "function f() {}" });
    is(parse("function f<T extends U>() {}"), { result: "function f() {}" });
    is(parse("function f(arg: T) {}"), { result: "function f(arg) {}" });
    is(parse("function f(arg: T, ...args: any[]) {}"), {
      result: "function f(arg, ...args) {}",
    });

    is(parse("function f(): void {}"), { result: "function f() {}" });
    // TODO: fix space eating by types
    is(parse("function f(): T {}"), { result: "function f(){}" });
    is(parse("function f(): T | U {}"), { result: "function f(){}" });
  });
  test("arrowFunctionExpression", () => {
    const parse = compile(arrowFunctionExpression);
    // expectSame(parse, ["a => 1"]);
    expectSame(parse, [
      "() => {}",
      "* () => {}",
      "(a) => 1",
      "a => 1",
      "({}) => 1",
      "async () => {}",
      "async () => await p",
      "async () => await new Promise(r => setTimeout(r))",
    ]);
    is(parse("() => {}"), { result: "() => {}" });
    is(parse("<T>() => {}"), { result: "() => {}" });
    // TODO: fix space eating by types
    is(parse("(): T => {}"), { result: "()=> {}" });
    is(parse("(a:T) => {}"), { result: "(a) => {}" });
  });

  test("classExpression", () => {
    const parse = compile(classExpression);
    expectSame(parse, ["class X {}", "class {}", "class X extends Y {}"]);
    expectSame(parse, [
      "class{}",
      "class {}",
      "class extends A {}",
      "class { x; }",
      "class { x = 1;}",
      "class { x = 1; #y = 2;  }",
      "class { constructor() {} }",
      "class { constructor() { this.val = 1; } }",
      "class { foo() {} }",
      "class { async foo() {} }",
      "class { async foo() {} }",
      "class { static async foo() {} }",
    ]);
    is(parse("abstract class{}"), { result: "class{}" });
    is(parse("class { private x; }"), { result: "class { x; }" });
    is(parse("class { public x; }"), { result: "class { x; }" });
    is(parse("class<T>{}"), { result: "class{}" });
    is(parse("class<T> implements X{}"), { result: "class{}" });
    is(parse("class<T> extends C implements X{}"), {
      result: "class extends C{}",
    });
    is(parse("class{foo(): void {} }"), {
      result: "class{foo() {} }",
    });
    is(parse("class{foo(arg:T): void {} }"), {
      result: "class{foo(arg) {} }",
    });
    is(parse("class{foo<T>(arg:T): void {} }"), {
      result: "class{foo(arg) {} }",
    });
    is(parse("class{x:number;y=1;}"), {
      result: "class{x;y=1;}",
    });
  });

  test("callExpression", () => {
    const parse = compile(accessible);
    is(parse("func()").result, "func()");
    is(parse("func([])").result, "func([])");
    is(parse("func(1,2)").result, "func(1,2)");
    is(parse("func(1,2,)").result, "func(1,2,)");
    is(parse("f<T>()").result, "f()");
    is(parse("f?.()").result, "f?.()");
    is(parse("x.f()").result, "x.f()");
    is(parse("x.f<T>()").result, "x.f()");
  });

  test("binaryExpr", () => {
    const parse = compile(binaryExpression);
    expectSame(parse, [
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
    const parse = compile(paren);
    expectSame(parse, ["(1)", "((1))"]);
  });

  test("anyExpression", () => {
    const parse = compile(anyExpression, { end: true });
    expectSame(parse, [
      "i in []",
      "a = 1",
      "a ?? b",
      "1 + 1",
      "(1)",
      "1",
      "(1 + 1)",
      "1 + 1 + 1",
      "(1 + (1 * 2))",
      "((1 + 1) + (1 * 2))",
      "await 1",
      "await foo()",
      "(a).x",
      "(a + b).x",
      "(await x).foo",
      "typeof x",
      "await x",
      "await x++",
      "await await x",
      "aaa`bbb`",
      "f()`bbb`",
      "(x)`bbb`",
      "a.b().c``",
    ]);
    is(parse("a!"), { result: "a" });
    // remove typescript bang operator
    is(parse("(a.b)!"), { result: "(a.b)" });
  });

  test("identifier", () => {
    const parse = compile(identifier, { end: true });
    expectSame(parse, ["a", "$1", "abc", "a_e"]);
    expectError(parse, ["1_", "const", "typeof", "a-e"]);
  });

  test("destructivePattern", () => {
    const parse = compile(destructivePattern, { end: true });
    expectSame(parse, [
      "a",
      "a = 1",
      `{a}`,
      `{a: b}`,
      `{a:{b,c}}`,
      `{a: [a]}`,
      "{a = 1}",
      "{a: b = 1}",
      "{a, ...b}",
      "[]",
      "[ ]",
      "[,,,]",
      "[a]",
      "[,a]",
      "[a, ...b]",
      "[a = 1, ...b]",
      "[,...b]",
      "[[]]",
      "[{}]",
      "[{} = {}]",
      "[[a]]",
      "[[a], ...x]",
      "[[a,b, [c, d, e], [, g]],, [{x, y}], ...x]",
    ]);
    expectSame(parse, ["[]", `[a]`, `[[a,b]]`]);
    expectError(parse, ["a.b"]);
  });

  /* type annotations */
  test("asExpression", () => {
    const parse = compile(asExpression, { end: true });
    // const parse = compile(asExpression, { end: true });
    is(parse("1"), { result: "1" });
    is(parse("1 as number"), { result: "1" });
    is(parse("1 + 1 as number"), { result: "1 + 1" });
    is(parse("(a) as number"), { result: "(a)" });
    is(parse("(a as number)"), { result: "(a)" });
  });
  // test("typeExpression", () => {
  //   const parse = compile(typeExpression, { end: true });
  //   // const parse = compile(asExpression, { end: true });
  //   expectSame(parse, [
  //     "number",
  //     "string",
  //     "a | b",
  //     "a | b | c",
  //     "a & b",
  //     "a & b & c",
  //     "(a)",
  //     "(a) | (b)",
  //     "(a & b) & c",
  //   ]);
  //   // is(parse("1"), { result: "1" });
  //   // is(parse("1 as number"), { result: "1" });
  //   // is(parse("1 + 1 as number"), { result: "1 + 1" });
  //   // is(parse("(a) as number"), { result: "(a)" });
  //   // is(parse("(a as number)"), { result: "(a)" });
  // });

  run({ stopOnFail: true, isMain });
}
