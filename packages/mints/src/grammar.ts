import {
  OPERATORS,
  RESERVED_WORDS,
  REST_SPREAD,
  _ as _w,
  __ as __w,
} from "./constants";

import { compile, builder as $ } from "./ctx";

const _ = $.regex(_w);
const __ = $.regex(__w);

export const identifier = $.def(() =>
  $.seq([
    // TODO
    $.not($.or([...RESERVED_WORDS])),
    // $.r`(?!${RESERVED_WORDS.join("|")})([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)`,
    $.r`([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)`,
  ])
);

const ThisKeyword = $.tok("this");
const ImportKeyword = $.tok("import");

// const BINARY_OPS = "(" + OPERATORS.join("|") + ")";

/* TypeExpression */
const typeDeclareParameter = $.def(() =>
  $.seq([
    typeExpression,
    // extends T
    $.opt($.seq([_, "extends ", typeExpression])),
    _,
    $.opt($.seq(["=", _, typeExpression])),
  ])
);

// declare parameters
const typeDeclareParameters = $.def(() =>
  $.seq([
    "<",
    _,
    $.repeat_seq([typeDeclareParameter, _, ",", _]),
    $.seq([typeDeclareParameter, _, $.opt(",")]),
    _,
    ">",
  ])
);

// apply parameters
const typeParameters = $.def(() =>
  $.seq([
    "<",
    _,
    $.repeat_seq([typeExpression, _, ",", _]),
    $.seq([typeExpression, _, $.r`,?`]),
    _,
    ">",
  ])
);

const typeParen = $.def(() =>
  $.seq(["(", _, typeExpression, _, ")", _, $.opt(typeParameters)])
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
        $.seq([".", _, typeIdentifier]),
        $.seq(["[", _, $.opt(typeExpression), _, "]"]),
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
      ":",
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
    "[",
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
        ":",
        _,
        typeExpression,
        // _,
      ]),
      _typeNameableItem,
      _,
    ]),
    _,
    "]",
  ])
);

const typeFunctionArgs = $.def(() =>
  $.seq([
    $.repeat_seq([
      // args
      identifier,
      _,
      ":",
      _,
      typeExpression,
      _,
      ",",
      _,
    ]),
    $.or([
      // last
      $.seq([REST_SPREAD, _, identifier, _, ":", _, typeExpression]),
      $.seq([identifier, _, ":", _, typeExpression, _, $.opt(",")]),
      _,
    ]),
  ])
);

const _typeObjectItem = $.def(() =>
  $.or([
    $.seq([
      // async foo<T>(arg: any): void;
      $.opt("async "),
      identifier,
      _,
      $.opt(typeDeclareParameters),
      _,
      "(",
      _,
      typeFunctionArgs,
      _,
      ")",
      _,
      ":",
      _,
      typeExpression,
    ]),
    // member
    $.seq([
      $.opt($.seq(["readonly", __])),
      identifier,
      _,
      ":",
      _,
      typeExpression,
    ]),
  ])
);

const typeObjectLiteral = $.def(() =>
  $.seq([
    // object
    "{",
    _,
    $.repeat_seq([_typeObjectItem, _, $.r`(,|;)`, _]),
    $.opt(_typeNameableItem),
    _,
    $.r`(,|;)?`,
    _,
    "}",
  ])
);

const typeLiteral = $.def(() =>
  $.or([
    typeObjectLiteral,
    typeArrayLiteral,
    stringLiteral,
    numberLiteral,
    // TODO: rewrite template literal for typeExpression
    templateLiteral,
    booleanLiteral,
    nullLiteral,
  ])
);

const typeFunctionExpression = $.def(() =>
  $.seq([
    // function
    $.opt(typeDeclareParameters),
    _,
    "(",
    _,
    typeFunctionArgs,
    _,
    ")",
    _,
    "=>",
    _,
    // return type
    typeExpression,
  ])
);

const typeUnaryExpression = $.def(() =>
  $.seq([
    $.opt($.seq([$.r`(keyof|typeof|infer)`, __])),
    $.or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
    // generics parameter
  ])
);

const typeBinaryExpression = $.def(() =>
  $.seq([
    $.repeat_seq([typeUnaryExpression, _, $.or(["|", "&"]), _]),
    typeUnaryExpression,
  ])
);

const typeExpression = $.def(() => $.or([typeBinaryExpression]));

/*
  patterns
*/

// Destructive Pattren
const destructiveArrayPattern = $.def(() =>
  $.seq([
    "[",
    _,
    $.repeat_seq([$.opt(destructivePattern), _, ",", _]),
    _,
    $.or([
      $.seq([REST_SPREAD, _, identifier]),
      $.opt<any>(destructivePattern),
      _,
    ]),
    _,
    $.r`,?`,
    _,
    "]",
  ])
);

const destructiveObjectItem = $.def(() =>
  $.or([
    $.seq([
      // a : b
      identifier,
      _,
      $.opt($.seq([":", _, destructivePattern])),
      // a: b = 1,
      $.opt($.seq([_, "=", _, anyExpression])),
    ]),
  ])
);

const destructiveObjectPattern = $.def(() =>
  $.seq([
    "{",
    _,
    $.repeat_seq([destructiveObjectItem, _, ",", _]),
    $.or([$.seq([REST_SPREAD, _, identifier]), destructiveObjectItem, _]),
    _,
    "}",
  ])
);

export const destructivePattern = $.def(() =>
  $.seq([
    $.or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    $.opt($.seq([_, "=", _, anyExpression])),
  ])
);

const lefthand = $.def(() => destructivePattern);

const functionArguments = $.def(() =>
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

const callArguments = $.def(() =>
  $.seq([
    $.repeat_seq([anyExpression, _, ","]),
    _,
    $.or([
      // rest spread
      $.seq([REST_SPREAD, _, anyExpression]),
      anyExpression,
      _,
    ]),
  ])
);

/* Expression */

export const stringLiteral = $.def(() =>
  $.or([
    // double quote
    $.r`("[^"\\n]*")`,
    // single
    $.r`('[^'\\n]*')`,
  ])
);

const nonBacktickChars = "[^`]*";

export const templateLiteral = $.def(() =>
  $.seq([
    "`",
    // aaa${}
    $.repeat_seq([$.regex(nonBacktickChars), "${", _, anyExpression, _, "}"]),
    $.regex(nonBacktickChars),
    "`",
  ])
);

const regexpLiteral = $.def(() => $.seq([$.r`\\/[^\\/]+\\/([igmsuy]*)?`]));

// TODO: 111_000
// TODO: 0b1011
export const numberLiteral = $.def(() =>
  $.or([
    // 16
    $.r`(0(x|X)[0-9a-fA-F]+)`,
    // 8
    $.r`(0(o|O)[0-7]+)`,
    // 2
    $.r`(0(b|B)[0-1]+)`,
    // decimal
    $.r`([1-9][0-9_]*\\.\\d+|[1-9][0-9_]*|\\d)(e\\-?\\d+)?`,
  ])
);

export const booleanLiteral = $.def(() => $.r`(true|false)`);
export const nullLiteral = $.def(() => `null`);

const restSpread = $.def(() => $.seq([REST_SPREAD, _, anyExpression]));

export const arrayLiteral = $.def(() =>
  $.or([
    $.seq([
      "[",
      $.repeat(
        $.seq([
          // , item
          _,
          $.opt(anyExpression),
          _,
          ",",
        ])
      ),
      _,
      $.or([$.opt<any>(restSpread), anyExpression, _]),
      _,
      "]",
    ]),
  ])
);

// key: val
const objectItem = $.def(() =>
  $.or([
    $.seq([
      // function
      $.r`((async|get|set) )?`,
      $.or([stringLiteral, $.seq(["[", _, anyExpression, _, "]"]), identifier]),
      $.seq([_, "(", _, functionArguments, _, ")", _, block]),
    ]),
    $.seq([
      // value
      $.or([stringLiteral, $.seq(["[", _, anyExpression, _, "]"]), identifier]),
      // value or shorthand
      $.seq([_, ":", _, anyExpression]),
    ]),
    identifier,
  ])
);

// ref by key
const objectLiteral = $.def(() =>
  $.seq([
    "{",
    $.repeat($.seq([_, objectItem, _, ","])),
    _,
    $.or([$.opt<any>(restSpread), objectItem, _]),
    _,
    "}",
  ])
);

const anyLiteral = $.def(() =>
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
const accessModifier = $.r`(private|public|protected) `;
const staticModifier = $.tok(`static `);
const asyncModifier = $.tok("async ");
const getOrSetModifier = $.r`(get|set) `;
const classField = $.def(() =>
  $.or([
    $.seq([
      $.skip_opt(accessModifier),
      // $.tok("constructor"),
      "constructor",
      _,
      "(",
      _,
      functionArguments,
      _,
      ")",
      _,
      block,
    ]),
    // class member
    $.seq([
      $.skip_opt(accessModifier),
      $.opt(staticModifier),
      $.opt(asyncModifier),
      $.opt(getOrSetModifier),
      $.opt("*"),
      $.opt("#"),
      identifier,
      // <T>
      $.skip_opt($.seq([_, typeDeclareParameters])),
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
        block,
      ]),
    ]),
    // field
    $.seq([
      $.skip_opt(accessModifier),
      $.opt(staticModifier),
      $.opt("#"),
      identifier,
      $.skip_opt($.seq([_, _typeAnnotation])),
      _,
      $.opt($.seq(["=", _, anyExpression])),
      ";",
    ]),
  ])
);

export const classExpression = $.def(() =>
  $.seq([
    $.skip_opt("abstract "),
    "class",
    $.opt($.seq([__, identifier])),
    // <T>
    $.skip_opt(typeDeclareParameters),
    $.opt($.seq([__, "extends", __, anyExpression])),
    $.skip_opt($.seq([__, "implements", __, typeExpression])),
    _,
    "{",
    _,
    $.repeat_seq([_, classField, _]),
    _,
    // TODO: class field
    "}",
  ])
);

export const functionExpression = $.def(() =>
  $.seq([
    $.opt(asyncModifier),
    "function",
    _,
    $.opt("*"), // generator
    _,
    $.opt(identifier),
    _,
    $.skip_opt(typeDeclareParameters),
    _,
    "(",
    _,
    functionArguments,
    _,
    ")",
    _,
    $.skip_opt(_typeAnnotation),
    _,
    $.or([block, anyStatement]),
  ])
);

const arrowFunctionExpression = $.def(() =>
  $.seq([
    $.opt(asyncModifier),
    $.skip_opt(typeDeclareParameters),
    _,
    $.r`(\\*)?`,
    _,
    $.or([
      $.seq([
        "(",
        _,
        functionArguments,
        _,
        ")",
        $.skip_opt($.seq([_, _typeAnnotation])),
      ]),
      identifier,
    ]),
    _,
    "=>",
    _,
    $.or([block, anyStatement]),
  ])
);

const newExpression = $.def(() =>
  $.seq([
    "new",
    __,
    memberable,
    _,
    $.opt($.seq(["(", _, functionArguments, _, ")"])),
  ])
);

const paren = $.def(() => $.seq(["\\(", _, anyExpression, _, "\\)"]));
const primary = $.or([
  paren,
  newExpression,
  ImportKeyword,
  ThisKeyword,
  identifier,
]);

const __call = $.def(() =>
  $.or([
    $.seq([
      "?.",
      $.skip_opt($.seq([_, typeParameters])),
      _,
      "(",
      _,
      callArguments,
      _,
      ")",
    ]),
    $.seq([
      $.skip_opt($.seq([_, typeParameters])),
      _,
      "(",
      _,
      callArguments,
      _,
      ")",
    ]),
  ])
);

const memberAccess = $.def(() =>
  $.or([
    // ?. | .#a | .a
    $.seq([$.r`(\\?)?\\.`, $.r`\\#?`, identifier]),
    $.seq([$.r`(\\?\\.)?`, "[", _, anyExpression, _, "]"]),
    __call,
  ])
);

const memberable = $.def(() =>
  $.or([$.seq([primary, $.repeat(memberAccess)]), anyLiteral])
);

// call chain access and member access
const accessible = $.def(() =>
  $.or([
    // call chain
    $.seq([memberable, _, __call, _, $.repeat_seq([memberAccess])]),
    memberable,
  ])
);

const unary = $.def(() =>
  $.or([
    // with unary prefix
    $.seq([
      $.or(["++", "--", "void ", "typeof ", "delete ", "await ", "~", "!"]),
      unary,
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
      $.opt($.or(["++", "--"])),
      // ts bang operator
      $.skip_opt("!"),
    ]),
  ])
);

const binaryExpression = $.def(() =>
  $.seq([unary, $.repeat_seq([_, $.or([...OPERATORS]), _, unary])])
);

/* TypeExpression */

const asExpression = $.def(() =>
  $.seq([
    // foo as Type
    binaryExpression,
    $.skip_opt<any>($.seq([__, "as", __, typeExpression])),
  ])
);

// a ? b: c
const ternaryExpression = $.def(() =>
  $.seq([asExpression, _, "\\?", _, anyExpression, _, ":", _, anyExpression])
);

export const anyExpression = $.def(() =>
  $.or([ternaryExpression, asExpression])
);

const _typeAnnotation = $.seq([":", _, typeExpression]);
const emptyStatement = $.def(() => $.seq([$.r`(\\s)*`]));
const breakStatement = $.def(() => "break");
const debuggerStatement = $.def(() => "debugger");

const returnStatement = $.def(() =>
  $.seq([$.r`(return|yield)`, $.opt($.seq([__, anyExpression]))])
);

const throwStatement = $.def(() => $.seq(["throw", __, anyExpression]));

const blockOrStatement = $.def(() => $.or([block, anyStatement]));
const blockOrNonEmptyStatement = $.def(() => $.or([block, nonEmptyStatement]));

const blockStatement = $.def(() => block);

const labeledStatement = $.def(() =>
  $.seq([identifier, _, ":", _, blockOrNonEmptyStatement])
);

const _importRightSide = $.def(() =>
  $.seq([
    $.or([
      // default only
      identifier,
      $.seq(["*", __, "as", __, identifier]),
      // TODO: * as b
      $.seq([
        "{",
        _,
        $.repeat_seq([
          identifier,
          $.opt($.seq([__, "as", __, identifier])),
          _,
          ",",
          _,
        ]),
        // last item
        $.opt(
          $.seq([
            identifier,
            $.opt($.seq([__, "as", __, identifier, _, $.r`,?`])),
          ])
        ),
        _,
        "}",
      ]),
    ]),
    __,
    "from",
    __,
    stringLiteral,
  ])
);

const importStatement = $.def(() =>
  $.or([
    // import 'specifier';
    $.seq(["import", __, stringLiteral]),
    // import type
    $.seq([$.skip($.seq(["import", __, "type", __, _importRightSide]))]),
    // import pattern
    $.seq(["import", __, _importRightSide]),
  ])
);

const defaultOrIdentifer = $.or(["default", identifier]);

const exportStatement = $.def(() =>
  $.or([
    // TODO: skip: export type|interface
    // export clause
    $.seq([
      "export ",
      _,
      "{",
      _,
      $.repeat_seq([
        defaultOrIdentifer,
        $.opt($.seq([__, "as", __, defaultOrIdentifer])),
        _,
        ",",
        _,
      ]),
      // last item
      $.opt(
        $.seq([
          defaultOrIdentifer,
          $.opt($.seq([__, "as", __, defaultOrIdentifer])),
          $.opt(","),
        ])
      ),
      _,
      "}",
      $.opt($.seq([_, "from ", stringLiteral])),
    ]),
    // export named expression
    $.seq([
      "export ",
      $.or([variableStatement, functionExpression, classExpression]),
    ]),
  ])
);

const ifStatement = $.def(() =>
  // $.or([
  $.seq([
    // if
    "if",
    _,
    "(",
    _,
    anyExpression,
    _,
    ")",
    _,
    blockOrNonEmptyStatement,
    _,
    $.opt($.seq(["else", __, blockOrStatement])),
  ])
);

const switchStatement = $.def(() =>
  $.or([
    $.seq([
      "switch",
      _,
      "(",
      _,
      anyExpression,
      _,
      ")",
      _,
      "{",
      _,
      $.repeat_seq([
        "case",
        __,
        anyExpression,
        _,
        ":",
        _,
        // include empty statement
        blockOrStatement,
        _,
        $.opt(";"),
        _,
      ]),
      _,
      $.opt($.seq(["default", _, ":", _, blockOrStatement])),
      _,
      "}",
    ]),
  ])
);

const __assignSeq = $.seq(["=", _, anyExpression]);
export const variableStatement = $.def(() =>
  $.or([
    $.seq([
      // single
      $.r`(var|const|let) `,
      // x, y=1,
      $.repeat_seq([
        destructivePattern,
        _,
        $.skip_opt(_typeAnnotation),
        _,
        $.opt(__assignSeq),
        _,
        ",",
        _,
      ]),
      _,
      destructivePattern,
      _,
      $.skip_opt(_typeAnnotation),
      _,
      $.opt(__assignSeq),
    ]),
  ])
);

const declareVariableStatement = $.def(() =>
  $.seq([$.skip($.seq(["declare", __, variableStatement]))])
);

const typeStatement = $.def(() =>
  $.seq([
    $.skip(
      $.seq([
        $.opt($.seq(["export "])),
        "type",
        __,
        identifier,
        _,
        "=",
        _,
        typeExpression,
      ])
    ),
  ])
);
const interfaceStatement = $.def(() =>
  $.seq([
    // skip all
    $.skip(
      $.seq([
        $.opt($.seq(["export "])),
        "interface",
        __,
        identifier,
        $.opt($.seq([__, "extends", __, typeExpression])),
        _,
        typeObjectLiteral,
      ])
    ),
  ])
);

export const forStatement = $.def(() =>
  $.seq([
    "for",
    _,
    "(",
    _,
    // start
    $.or([variableStatement, anyExpression, _]),
    _,
    ";",
    // condition
    _,
    $.opt(anyExpression),
    _,
    ";",
    // step end
    $.opt(anyExpression),
    ")",
    _,
    blockOrNonEmptyStatement,
  ])
);

// include for in / for of
const forItemStatement = $.def(() =>
  $.seq([
    "for",
    _,
    "(",
    _,
    $.r`(var|const|let)`,
    __,
    destructivePattern,
    __,
    $.r`(of|in)`,
    __,
    anyExpression,
    _,
    ")",
    _,
    blockOrNonEmptyStatement,
  ])
);

export const whileStatement = $.def(() =>
  $.or([
    $.seq([
      "while",
      _,
      "(",
      _,
      anyExpression,
      _,
      ")",
      _,
      blockOrNonEmptyStatement,
    ]),
  ])
);

const doWhileStatement = $.def(() =>
  $.or([
    $.seq([
      "do",
      _,
      blockOrStatement,
      _,
      "while",
      _,
      "(",
      _,
      anyExpression,
      _,
      ")",
    ]),
  ])
);

const expressionStatement = $.def(() =>
  $.seq([anyExpression, $.repeat_seq([",", _, anyExpression])])
);

const nonEmptyStatement = $.def(() =>
  $.or([
    debuggerStatement,
    breakStatement,
    returnStatement,
    declareVariableStatement,
    variableStatement,
    typeStatement,
    interfaceStatement,
    ifStatement,
    importStatement,
    forItemStatement,
    forStatement,
    doWhileStatement,
    whileStatement,
    switchStatement,
    labeledStatement,
    blockStatement,
    expressionStatement,
  ])
);

export const anyStatement = $.def(() =>
  $.or([nonEmptyStatement, emptyStatement])
);

const statementLine = $.or([
  // $.seq([
  //   _,
  //   $.or([
  //     "\\/\\/[^\\n]*",
  //     // semicolon less allowed statements
  //     blockStatement,
  //     ifStatement,
  //     whileStatement,
  //     blockStatement,
  //     forItemStatement,
  //     interfaceStatement,
  //     functionExpression,
  //     classExpression,
  //   ]),
  //   _,
  //   "(\\;?\\n?|\\n)",
  // ]),
  // semicolon
  // $.seq([_, anyStatement, _, "(\\;\\n?|\\n)"]),
  $.seq([_, anyStatement, _, $.r`[;\n]`, _]),
  // empty line
  $.seq([_, ";", _]),
]);

export const block = $.def(() =>
  $.seq(["{", _, $.repeat(statementLine), _, "}"])
);

export const program = $.def(() => $.seq([$.repeat(statementLine), $.eof()]));

import { test, run, is } from "@mizchi/test";
import { expectError, expectSame, formatError } from "./_testHelpers";

const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  test("empty", () => {
    const parseEmpty = compile(emptyStatement);
    is(parseEmpty("").result, "");
    // is(parseEmpty(";").result, ";");
    // is(parseEmpty(";;;").result, ";;;");
    is(parseEmpty("\n").result, "\n");
    is(parseEmpty("\n\n").result, "\n");
  });
  test("identifier", () => {
    const parse = compile(identifier);
    expectSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1", "aAa"]);
    expectError(parse, ["1", "1_", "const", "public"]);
  });

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

  test("newExpression", () => {
    const parse = compile(newExpression, { end: true });
    expectSame(parse, ["new X()", "new X[1]()", "new X.Y()"]);
  });

  test("memberExpression", () => {
    const parse = compile(memberable, { end: true });
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
    // // TODO: fix space eating by types
    is(parse("function f(): T {}"), { result: "function f(){}" });
    is(parse("function f(): T | U {}"), { result: "function f(){}" });
  });
  test("arrowFunctionExpression", () => {
    const parse = compile(arrowFunctionExpression);
    expectSame(parse, ["a => 1"]);
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
      "class { get foo() {} }",
      "class { set foo() {} }",
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

  test("anyExpression", () => {
    const parse = compile(anyExpression, { end: true });
    expectSame(parse, [
      "a + a",
      "1 = 1",
      "1 + 1",
      "1 * 2",
      "((1))",
      "(1)",
      "1*2",
      "1**2",
      "1 + (1)",
      "(1) + 1",
      "( 1 + 1) + 1",
      "( 1 + 1) * 1 + 2 / (3 / 4)",
      "1",
      "i in []",
      "a.b",
      "a",
      "a.b.c",
      "a[1]",
      "new X().b",
      "a?.b",
      "this.#a",
      "a?.[x]",
      "import.meta",
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
      "a?b:c",
      "(a ? b : c).d",
      "(a ? b : c ? d : e ).d",
      "a().a()",
      "import('aaa')",
      "(()=>{})()",
      "(async ()=>{})()",
    ]);
    is(parse("a!"), { result: "a" });
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
    expectError(parse, ["a.b", "[a.b]"]);
  });

  /* type annotations */
  test("asExpression", () => {
    const parse = compile(asExpression, { end: true });
    is(parse("1"), { result: "1" });
    is(parse("1 as number"), { result: "1" });
    is(parse("1 + 1 as number"), { result: "1 + 1" });
    is(parse("(a) as number"), { result: "(a)" });
    is(parse("(a as number)"), { result: "(a)" });
  });

  test("typeExpression", () => {
    const parse = compile(typeExpression, { end: true });
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

  // statements

  test("debugger", () => {
    const parse = compile(debuggerStatement);
    is(parse("debugger").result, "debugger");
  });
  test("return", () => {
    const parse = compile(returnStatement);
    expectSame(parse, ["return", "return 1"]);
  });
  test("throw", () => {
    const parse = compile(throwStatement);
    expectSame(parse, ["throw 1"]);
    expectError(parse, ["throw"]);
  });
  test("block", () => {
    const parse = compile($.seq([block, $.eof()]));
    expectSame(parse, [`{ return 1; }`, `{ debugger; return; }`, "{}"]);
  });
  test("for", () => {
    const parse = compile(forStatement, { end: true });
    expectSame(parse, [
      "for(x=0;x<1;x++) x",
      "for(x=0;x<1;x++) {}",
      "for(;;) x",
      "for(let x = 1;x<6;x++) x",
      "for(let x = 1;x<6;x++) {}",
      "for(;;) {}",
      "for(;x;x) {}",
    ]);
    expectError(parse, ["for(;;)"]);
  });

  test("for-item", () => {
    const parse = compile(forItemStatement, { end: true });
    expectSame(parse, [
      "for(const i of array) x",
      "for(const k in array) x",
      "for(let {} in array) x",
      "for(let {} in []) x",
      "for(let [] in xs) {}",
    ]);
    expectError(parse, ["for(const i of t)"]);
  });
  test("while", () => {
    const parse = compile($.seq([whileStatement, $.eof()]));
    expectSame(parse, ["while(1) 1", "while(1) { break; }"]);
    expectError(parse, ["while(1)"]);
  });

  test("if", () => {
    const parse = compile($.seq([ifStatement, $.eof()]));
    expectSame(parse, [
      "if(1) 1",
      `if(1) { return 1; }`,
      `if(1) 1 else 2`,
      `if (1) 1 else if (1) return`,
      `if (1) 1 else if (1) return else 1`,
      `if (1) { if(2) return; }`,
    ]);
  });

  test("switch", () => {
    const parse = compile($.seq([switchStatement, $.eof()]));
    expectSame(parse, [
      `switch (x) {}`,
      `switch(true){ default: 1 }`,
      `switch(x){ case 1: 1 }`,
      `switch(x){
        case 1:
        case 2:
      }`,
      `switch(x){
        case 1:
        case 2:
          return
      }`,
      `switch(x){
        case 1: {}
        case 2: {}
      }`,
    ]);
  });

  test("variableStatement", () => {
    const parse = compile(variableStatement);
    expectSame(parse, [
      "let x",
      "let x,y",
      "let x,y,z",
      "let x,y=1,z",
      "let x=1",
      "const [] = []",
      "const {} = {}, [] = a",
    ]);
    is(parse("let x = 1").result, "let x = 1");
    is(parse("let x: number = 1").result, "let x= 1");
  });

  test("variableStatement2", () => {
    const parse = compile(variableStatement, { end: true });
    expectSame(parse, ["let x", "let x = 1", "let x,y"]);
    is(parse("let x:number = 1"), { result: "let x= 1" });
    is(parse("let x:any"), { result: "let x" });
    is(parse("let x:number = 1,y:number=2"), { result: "let x= 1,y=2" });
  });

  test("importStatement", () => {
    const parse = compile(importStatement, { end: true });
    expectSame(parse, [
      "import 'foo'",
      "import * as b from 'xx'",
      "import a from 'b'",
      'import {} from "b"',
      'import {a} from "x"',
      'import {a, b} from "x"',
      'import {a as b} from "x"',
      'import {a as b, d as c,} from "x"',
    ]);
    // drop import type
    is(parse("import type a from 'xxx'").result, "");
    is(parse("import type * as b from 'xxx'").result, "");
    is(parse("import type {a as b} from 'xxx'").result, "");
  });
  test("exportStatement", () => {
    const parse = compile(exportStatement, { end: true });
    expectSame(parse, [
      "export {}",
      "export {a}",
      "export {a,b}",
      "export {a as b}",
      "export {a as default}",
      "export {default as default}",
      "export {} from 'a'",
      "export {default as x} from 'a'",
      "export const x = 1",
      "export function f(){}",
      "export class C {}",
    ]);
  });

  test("expressionStatement", () => {
    const parse = compile(expressionStatement);
    expectSame(parse, ["1", "func()", "a = 1", "a.b = 1", "1, 1", "a=1"]);
    expectSame(parse, ["1", "func()"]);
  });

  test("anyStatement", () => {
    const parse = compile(anyStatement);
    expectSame(parse, ["debugger", "{ a=1; }", "foo: {}", "foo: 1"]);
  });

  test("program:with as", () => {
    const parse = compile(program);
    is(parse("1 as number;"), {
      result: "1;",
    });
  });

  test("program", () => {
    const parse = compile(program, { end: true });
    expectSame(parse, [
      "const x = 1;",
      "const x = 'xxxx';",
      "debugger;",
      "debugger; debugger;   debugger   ;",
      ";;;",
      "",
      "import a from 'b';",
      // "export {};",
    ]);
    is(parse("declare const x: number;"), { result: ";" });
    is(parse("declare const x: number = 1;"), { result: ";" });
    is(parse("type x = number;"), { result: ";" });
    is(parse("type x = {};"), { result: ";" });
    is(parse("export type x = number;"), { result: ";" });
    is(parse("interface I {};"), { result: ";" });
    is(parse("interface I extends T {};"), { result: ";" });
    is(parse("interface I extends T { a: number; };"), { result: ";" });
    is(parse("export interface I {};"), { result: ";" });

    // const code = `let a: number, b: number, c: Array<string>;
    // const x:  number = 1;

    // function square(x: number): number {
    //   return x ** 2;
    // }

    // // type IPoint = {
    // //   x: number;
    // //   y: number;
    // // };
    // // interface X {}

    // class Point<T extends IPoint = any> implements IPoint {
    //   public x: number;
    //   private y: number;
    //   constructor() {
    //     this.x = 1;
    //     this.y = 2;
    //   }
    //   public static async foo(arg: number): number {
    //     return arg;
    //   }
    // }

    // // func<T>();
    // `;
    // is(parse(code), { error: false });
  });

  //   test("long program", () => {
  //     const parse = compile(program, { end: true });
  //     const code2 = `
  // let a: number, b: number[], c: Array<string>;
  // const x:  number = 1;
  // function square(x: number): number {
  //   return x ** 2;
  // }
  // interface X {}`;
  //     is(parse(code2), { error: false });
  //   });

  //   test("long program", () => {
  //     const parse = compile(program, { end: true });
  //     const code = `a;
  // class {};
  // a;
  // `;
  //     is(parse(code), { error: false });
  //   });

  run({ stopOnFail: true, stub: true, isMain });
}
