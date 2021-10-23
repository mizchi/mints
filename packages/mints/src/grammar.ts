import { NodeKind, Token } from "./../../pargen/src/types";
import {
  OPERATORS,
  RESERVED_WORDS,
  REST_SPREAD,
  SPACE_REQUIRED_OPERATORS,
  _ as _w,
  __ as __w,
} from "./constants";

import { compile, builder as $ } from "./ctx";

const _ = $.regex(_w);
const _s = $.skip($.regex(_w));
const __ = $.regex(__w);

const reserved = RESERVED_WORDS.join("|");
export const identifier = $.def(() =>
  $.seq([
    // TODO: doc
    // $.not($.or([...RESERVED_WORDS])),
    // $.r`([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)`,
    $.regex(`(?!(${reserved})$)([a-zA-Z_$][a-zA-Z_$0-9]*)`),
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
    $["*"]([typeDeclareParameter, _, ",", _]),
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
    $["*"]([typeExpression, _, ",", _]),
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
    $["*"]([
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
      $.opt($.seq([_, "?"])),
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
    $["*"]([_typeNameableItem, _, ",", _]),
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
    $["*"]([
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
      // $.opt($.seq([_, "?"])),
      _,
      $.or([":", "?:"]),
      // ":",
      _,
      typeExpression,
    ]),
  ])
);

const typeObjectLiteral = $.def(() =>
  $.seq([
    // object
    "{",
    $["*"]([_, _typeObjectItem, _, $.r`(,|;)`]),
    $.opt($.seq([_, _typeNameableItem])),
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
    $["*"]([typeUnaryExpression, _, $.or(["|", "&"]), _]),
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
    _s,
    $["*"]([
      // item, {},,
      $.opt($.seq([destructive, _s, $.opt($.seq([_s, assign]))])),
      _s,
      ",",
      _s,
    ]),
    $.or([
      // [,...i]
      $.seq([REST_SPREAD, _, identifier]),
      // [,a = 1 ,]
      $.seq([destructive, _s, $.opt($.seq([_s, assign])), $.opt(",")]),
      $.seq([_, $.opt(",")]),
    ]),
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
      $.opt($.seq([":", _, destructive])),
      // a: b = 1,
      $.opt($.seq([_s, assign])),
    ]),
  ])
);

const destructiveObjectPattern = $.def(() =>
  $.seq([
    "{",
    _s,
    $["*"]([destructiveObjectItem, _, ",", _]),
    $.or([
      // ...
      $.seq([REST_SPREAD, _, identifier]),
      destructiveObjectItem,
      _s,
    ]),
    _s,
    "}",
  ])
);

export const destructive = $.def(() =>
  $.seq([
    $.or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    // { a = 1 } = {}
    $.opt($.seq([_s, assign])),
  ])
);

export const destructiveNoAssign = $.def(() =>
  $.or([
    // {} | [] | a
    destructiveObjectPattern,
    destructiveArrayPattern,
    identifier,
  ])
);

export const functionArgWithAssign = $.def(() =>
  $.seq([
    $.or([
      // pattern(:T)?
      destructiveObjectPattern,
      destructiveArrayPattern,
      identifier,
    ]),
    $.skip_opt($.seq([_, ":", _, typeExpression])),
    $.opt($.seq([_, "=", _, anyExpression])),
  ])
);
// const lefthand = $.def(() => destructivePattern);

// const x = $.opt(destructivePattern);

const functionArguments = $.def(() =>
  $.seq([
    // (a: T = 1,)+
    $["*"]([functionArgWithAssign, _s, ",", _s]),
    $.or([
      // ...args
      $.seq([
        _s,
        // ...args(:T)?
        REST_SPREAD,
        _s,
        identifier,
        $.skip_opt($.seq([_s, _typeAnnotation])),
      ]),
      // a: T
      $.seq([
        _s,
        $.seq([functionArgWithAssign, _s, $.opt(",")]),
        $.skip_opt($.seq([_s, ","])),
      ]),
      // no arg
      _s,
      // $.seq([
      //   destructive,
      //   _s,
      //   $.skip_opt(_typeAnnotation),

      //   // x:number[ = 1]
      //   $.opt($.seq([_s, assign])),
      // ]),
      // _s,
    ]),
    $.skip_opt($.seq([_s, ","])),
    _s,
  ])
);

const callArguments = $.def(() =>
  $.seq([
    $["*"]([anyExpression, _s, ",", _s]),
    _s,
    $.or([
      // rest spread
      $.seq([REST_SPREAD, _s, anyExpression]),
      anyExpression,
      _s,
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
    $["*"]([$.regex(nonBacktickChars), "${", _, anyExpression, _, "}"]),
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
      $.or([
        stringLiteral,
        $.seq(["[", _s, anyExpression, _s, "]"]),
        identifier,
      ]),
      $.seq([_s, "(", _s, functionArguments, _s, ")", _s, block]),
    ]),
    $.seq([
      // value
      $.or([
        // key:
        stringLiteral,
        // [key]:
        $.seq(["[", _s, anyExpression, _s, "]"]),
        // a
        identifier,
      ]),
      // value or shorthand
      $.seq([_s, ":", _s, anyExpression]),
    ]),
    // rest spread
    $.seq([REST_SPREAD, _s, anyExpression]),
    // shothand
    identifier,
  ])
);

// ref by key
const objectLiteral = $.def(() =>
  $.seq([
    "{",
    _s,
    $.repeat($.seq([objectItem, _s, ",", _s])),
    _s,
    // $.opt($.or([restSpread, objectItem])),
    $.or([$.opt<any>(restSpread), objectItem, _s]),
    _s,
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
      "constructor",
      _s,
      "(",
      functionArguments,
      ")",
      _s,
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
        "(",
        functionArguments,
        ")",
        $.skip_opt($.seq([_, _typeAnnotation])),
        _s,
        block,
      ]),
    ]),
    // field
    $.seq([
      $.skip_opt(accessModifier),
      $.opt(staticModifier),
      $.opt("#"),
      identifier,
      $.skip_opt($.seq([_s, _typeAnnotation])),
      _s,
      $.opt($.seq(["=", _s, anyExpression])),
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
    _s,
    "{",
    _s,
    $["*"]([_s, classField, _s]),
    _s,
    // TODO: class field
    "}",
  ])
);

export const functionExpression = $.def(() =>
  $.seq([
    $.opt(asyncModifier),
    "function",
    $.opt($.seq([_s, "*"])),
    $.opt($.seq([__, identifier])),
    _s,
    $.skip_opt(typeDeclareParameters),
    _s,
    "(",
    _s,
    functionArguments,
    _s,
    ")",
    _s,
    $.skip_opt(_typeAnnotation),
    _s,
    $.or([block, anyStatement]),
  ])
);

const arrowFunctionExpression = $.def(() =>
  $.seq([
    $.opt(asyncModifier),
    $.skip_opt(typeDeclareParameters),
    _s,
    $.r`(\\*)?`,
    _s,
    $.or([
      $.seq([
        "(",
        _s,
        functionArguments,
        _s,
        ")",
        $.skip_opt($.seq([_, _typeAnnotation])),
      ]),
      identifier,
    ]),
    _s,
    "=>",
    _s,
    $.or([block, anyStatement]),
  ])
);

const newExpression = $.def(() =>
  $.seq([
    "new ",
    memberable,
    _s,
    $.opt($.seq(["(", _s, functionArguments, _s, ")"])),
  ])
);

const paren = $.def(() =>
  $.seq(["\\(", _s, anyExpression, _s, "\\)", $.not("=>")])
);
const primary = $.or([
  paren,
  newExpression,
  ImportKeyword,
  ThisKeyword,
  objectLiteral,
  stringLiteral,
  regexpLiteral,
  templateLiteral,
  identifier,
]);

const __call = $.def(() =>
  $.or([
    $.seq([
      "?.",
      $.skip_opt($.seq([_, typeParameters])),
      _s,
      "(",
      _s,
      callArguments,
      _s,
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
    $.seq([_s, $.r`(\\?)?\\.`, $.r`\\#?`, identifier]),
    $.seq([_s, $.r`(\\?\\.)?`, "[", _s, anyExpression, _s, "]"]),
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
    $.seq([memberable, _s, __call, _s, $["*"]([memberAccess])]),
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
  $.seq([
    unary,
    $["*"]([
      // _s,
      $.or([
        ...SPACE_REQUIRED_OPERATORS.map((op) => $.seq([__, op, __])),
        ...OPERATORS.map((op) => $.seq([_s, op, _s])),
      ]),
      // _s,
      unary,
    ]),
  ])
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
  $.seq([
    asExpression,
    _s,
    "\\?",
    _s,
    anyExpression,
    _s,
    ":",
    _s,
    anyExpression,
  ])
);

export const anyExpression = $.def(() =>
  $.or([ternaryExpression, asExpression])
);

const _typeAnnotation = $.seq([":", _, typeExpression]);
// const emptyStatement = $.def(() => $.seq([$.r`(\\s)*`]));
const breakStatement = $.def(() => "break");
const debuggerStatement = $.def(() => "debugger");

const returnStatement = $.def(() =>
  $.seq([$.r`(return|yield)`, $.opt($.seq([__, anyExpression]))])
);

const throwStatement = $.def(() => $.seq(["throw", __, anyExpression]));

const blockOrStatement = $.def(() => $.or([block, anyStatement]));

const blockStatement = $.def(() => block);

const labeledStatement = $.def(() =>
  $.seq([identifier, _s, ":", _s, anyStatement])
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
        _s,
        $["*"]([
          identifier,
          $.opt($.seq([__, "as", __, identifier])),
          _s,
          ",",
          _s,
        ]),
        // last item
        $.opt(
          $.seq([
            identifier,
            $.opt($.seq([__, "as", __, identifier, _s, $.r`,?`])),
          ])
        ),
        _s,
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
      "export",
      _s,
      "{",
      _s,
      $["*"]([
        defaultOrIdentifer,
        $.opt($.seq([__, "as", __, defaultOrIdentifer])),
        _s,
        ",",
        _s,
      ]),
      // last item
      $.opt(
        $.seq([
          defaultOrIdentifer,
          $.opt($.seq([__, "as", __, defaultOrIdentifer])),
          $.opt(","),
        ])
      ),
      _s,
      "}",
      $.opt($.seq([_s, "from ", stringLiteral])),
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
    _s,
    "(",
    _s,
    anyExpression,
    _s,
    ")",
    _s,
    blockOrStatement,
    _s,
    $.opt(
      $.seq([
        "else",
        $.or([
          // xx
          $.seq([_s, block]),
          $.seq([__, anyStatement]),
        ]),
      ])
    ),
  ])
);

const switchStatement = $.def(() =>
  $.seq([
    "switch",
    _s,
    "(",
    _s,
    anyExpression,
    _s,
    ")",
    _s,
    "{",
    _s,
    $["*"]([
      $["+"](["case ", anyExpression, _s, ":", _s]),
      $.opt(
        $.seq([
          // xxx
          $.or([block, anyStatement]),
          _s,
          $.opt(";"),
        ])
      ),
      _s,
    ]),
    _s,
    $.opt($.seq(["default", _s, ":", _s, blockOrStatement])),
    _s,
    "}",
  ])
);

const assign = $.def(() => $.seq(["=", _s, anyExpression]));
export const variableStatement = $.def(() =>
  $.seq([
    // single
    $.r`(var|const|let) `,
    // x, y=1,
    $["*"]([
      destructive,
      _s,
      $.skip_opt(_typeAnnotation),
      $.opt($.seq([_s, assign])),
      _s,
      ",",
      _s,
    ]),
    _s,
    destructive,
    _s,
    $.skip_opt(_typeAnnotation),
    $.opt($.seq([_s, assign])),
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
    _s,
    "(",
    _s,
    // start
    $.or([variableStatement, anyExpression, _]),
    _s,
    ";",
    // condition
    _s,
    $.opt(anyExpression),
    _s,
    ";",
    // step end
    $.opt(anyExpression),
    ")",
    _s,
    blockOrStatement,
  ])
);

// include for in / for of
const forItemStatement = $.def(() =>
  $.seq([
    "for",
    _s,
    "(",
    _s,
    $.r`(var|const|let) `,
    _s,
    destructive,
    __,
    $.r`(of|in)`,
    __,
    anyExpression,
    _s,
    ")",
    _s,
    blockOrStatement,
  ])
);

export const whileStatement = $.def(() =>
  $.seq(["while", _s, "(", _s, anyExpression, _s, ")", _s, blockOrStatement])
);

const doWhileStatement = $.def(() =>
  $.or([
    $.seq([
      "do",
      $.or([$.seq([_s, block]), $.seq([__, anyStatement])]),
      _,
      "while",
      _s,
      "(",
      _s,
      anyExpression,
      _s,
      ")",
    ]),
  ])
);

const expressionStatement = $.def(() =>
  $.seq([anyExpression, $["*"]([",", _s, anyExpression])])
);

const semicolonlessStatement = $.def(() =>
  $.or([
    // export function/class
    $.seq(["export ", $.or([functionExpression, classExpression])]),

    classExpression,
    functionExpression,
    ifStatement,
    whileStatement,
    switchStatement,
    doWhileStatement,
    interfaceStatement,
    forStatement,
    forItemStatement,
    blockStatement,
  ])
);

const anyStatement = $.def(() =>
  $.or([
    debuggerStatement,
    breakStatement,
    returnStatement,
    throwStatement,
    declareVariableStatement,
    variableStatement,
    typeStatement,
    interfaceStatement,
    ifStatement,
    importStatement,
    exportStatement,
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

const lines = $.seq([
  $["*"]([
    $.or([
      $.seq([
        // class{}(;\n)
        semicolonlessStatement,
        $.or([$.skip($.tok("\n")), $.tok(";"), $.skip(_)]),
      ]),
      // $.seq([$.opt(anyStatement), _, $.r`[;\\n]+`, _]),
      $.seq([
        // enter or semicolon end statements
        $.opt(anyStatement),
        $.r`[ ]*`,
        // $.r`[\\n;]`,
        $.or([$.skip($.tok("\n")), $.tok(";")]),
        _s,
      ]),
    ]),
  ]),
  $.opt(anyStatement),
  $.skip_opt(";"),
]);

export const block = $.def(() => $.seq(["{", _s, lines, _s, "}"]));

export const program = $.def(() => $.seq([_s, lines, _s, $.eof()]));

import { test, run, is } from "@mizchi/test";
// import { expectError, expectSame } from "./_testHelpers";
import { preprocessLight } from "./preprocess";
import { ErrorType, ParseError } from "@mizchi/pargen/src/types";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const ts = require("typescript");
  const prettier = require("prettier");
  function compileTsc(input: string) {
    return ts.transpile(input, {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.Latest,
    });
  }

  const _format = (input: string, format: boolean, stripTypes: boolean) => {
    input = stripTypes ? compileTsc(input) : input;
    return format ? prettier.format(input, { parser: "typescript" }) : input;
  };

  const expectSame = (
    parse: any,
    inputs: string[],
    {
      format = true,
      stripTypes = true,
    }: { format?: boolean; stripTypes?: boolean } = {}
  ) => {
    inputs.forEach((raw) => {
      const input = preprocessLight(raw);
      const result = parse(input);
      if (result.error) {
        // formatError(input, result);
        reportError(input, result);
        // throw "Unexpected";
        throw new Error(
          "Unexpected Result: input|" + input.replace(/\n/g, "\\n")
        );
        // throw `Expect: ${input}\nOutput: ${result}`;
      } else {
        const resultf = format
          ? _format(result.result as string, format, stripTypes)
          : result.result;
        const expectedf = format ? _format(input, format, stripTypes) : input;
        if (resultf !== expectedf) {
          throw `Expect: ${input}\nOutput: ${JSON.stringify(result, null, 2)}`;
        }
      }
    });
  };

  const expectError = (parse: any, inputs: string[]) => {
    inputs.forEach((input) => {
      const result = parse(preprocessLight(input));
      if (!result.error) {
        throw new Error("Unexpected SameResult:" + result);
      }
    });
  };

  function formatError(input: string, error: ParseError) {
    const deepError = findMaxPosError(error, error);
    console.log("max depth", deepError.pos);
    _formatError(input, deepError);
  }

  function reportError(input: string, error: ParseError) {
    const deepError = findMaxPosError(error, error);
    const sliced = input.slice(0, deepError.pos);
    const lines = sliced.split(/[\n;]/);
    const errorLine = lines[lines.length - 1];
    const errorLineStart = Array.from(lines.slice(0, -1).join("\n")).length;
    const errorLineNumber = lines.length;
    const errorColumn = deepError.pos - errorLineStart;

    const linePrefix = `L${errorLineNumber}:${errorColumn}\t`;
    const errorNextLine = input.slice(deepError.pos).split(/[\n;]/)[0];
    const errorSummary = `${deepError.pos}:${NodeKind[error.kind]}(${
      error.rootId
    }>${error.id}|${ErrorType[error.errorType]}`;
    const outputLine = `${linePrefix}${errorLine}${errorNextLine}`;
    const errorCursor =
      linePrefix + " ".repeat(deepError.pos - errorLineStart) + "^";
    console.log(`${errorSummary}}\n${outputLine}\n${errorCursor}`);
    // console.log(error);
  }

  function findMaxPosError(
    error: ParseError,
    currentError: ParseError
  ): ParseError {
    if (error.pos === currentError.pos) {
      if (error.errorType === ErrorType.Token_Unmatch) {
        currentError = error;
      }
    } else {
      currentError = error.pos > currentError.pos ? error : currentError;
    }

    if (error.errorType === ErrorType.Seq_Stop) {
      currentError = findMaxPosError(error.detail.child, currentError);
    }

    if (error.errorType === ErrorType.Or_UnmatchAll) {
      for (const e of error.detail.children) {
        currentError = findMaxPosError(e, currentError);
      }
    }
    // if (error.kind === "") {
    //   currentError = findMaxPosError(error.detail.child, currentError);
    // }

    return currentError;
  }

  function _formatError(input: string, error: ParseError, depth: number = 0) {
    if (depth === 0) {
      console.error("[parse:fail]", error.pos);
    }
    const prefix = " ".repeat(depth * 2);
    console.log(
      prefix,
      `${ErrorType?.[error.errorType]}[${error.pos}]`,
      `<$>`,
      input.substr(error.pos).split("\n")[0] + " ..."
    );
    if (error.errorType === ErrorType.Token_Unmatch && error.detail) {
      console.log(prefix, ">", error.detail);
    }
    if (error.errorType === ErrorType.Not_IncorrectMatch) {
      console.log(prefix, "matche", error);
    }

    if (error.errorType === ErrorType.Seq_Stop) {
      _formatError(input, error.detail.child, depth + 1);
    }

    if (error.errorType === ErrorType.Or_UnmatchAll) {
      for (const e of error.detail.children) {
        _formatError(input, e, depth + 1);
      }
    }
  }

  test("identifier", () => {
    const parse = compile(identifier);
    expectSame(parse, ["a", "aa", "_", "_a", "$", "$_", "_1", "aAa", "doc"]);
    expectError(parse, ["1", "1_", "const", "public", "do", " do", ""]);
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
    expectSame(
      parseExpression,
      [
        `{}`,
        `{}`,
        `{a:1}`,
        `{a:1,b:2}`,
        `{a:1,b:2,}`,
        `{a:1,b:2,...rest}`,
        `{a}`,
        `{a,b}`,
        `{[1]:1}`,
        `{a(){}}`,
        `{[1](){}}`,
        `{async a(){}}`,
        `{get a(){}}`,
        `{set a(){}}`,
        `{get 'aaa'(){}}`,
        `{"a":1,"b":"text","c":true,"d":null}`,
        `{"a":{"b":"2"},c:{},"d":[1],"e":[{}]}`,
      ],
      { format: false }
    );
    expectError(parseExpression, [`{ async a: 1 }`, `{ async get a() {} }`]);
    is(parseExpression(`{\n }`).result, "{}");
  });

  test("newExpression", () => {
    const parse = compile(newExpression, { end: true });
    expectSame(parse, ["new X()", "new X[1]()", "new X.Y()"]);
  });

  test("memberExpression", () => {
    const parse = compile(memberable, { end: true });
    expectSame(parse, ["a.b", "a\n.b"]);
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
      // "++x++",
    ]);
    // expectError(parse, ["a.new X()", "a.this"]);
  });

  test("functionExpression", () => {
    const parse = compile(functionExpression);
    // expectResult(parse, "function () {}", "function(){}");
    // expectResult(parse, "function * () {}", "function*(){}");

    expectSame(parse, [
      "function f(){}",
      // "function*f(){}",
      "async function f({a})1",
      "function f(a){}",
      "function f(a,){}",
      "function f(a,b){}",
      "function f(a,b,c){}",
      "function f(a,b,c,){}",
      "function f(a,b,c,d){}",
      "function f(a,b,c,...args){}",

      "function f({a, b}){}",
      "function f({a, b})return 1",
      "function f({a})1",
      "function f()1",
    ]);
    // drop types
    is(parse("function f() {}"), { result: "function f(){}" });
    is(parse("function f() {}"), { result: "function f(){}" });
    is(parse("function f<T extends U>() {}"), { result: "function f(){}" });
    is(parse("function f(arg: T){}"), { result: "function f(arg){}" });
    is(parse("function f(arg: T, ...args: any[]){}"), {
      result: "function f(arg,...args){}",
    });
    is(parse("function f(): void {}"), { result: "function f(){}" });
    // // TODO: fix space eating by types
    is(parse("function f(): T {}"), { result: "function f(){}" });
    is(parse("function f(): T | U {}"), { result: "function f(){}" });
  });
  test("arrowFunctionExpression", () => {
    const parse = compile(arrowFunctionExpression);
    expectSame(parse, ["a=>1"]);
    expectSame(parse, [
      "()=>{}",
      // "*()=>{}",
      "(a)=>1",
      "(a,b)=>1",
      "(a,b,)=>1",
      "(a,b,c)=>1",
      "(a,b,c,)=>1",
      "(a:number)=>1",
      "<T>(a:number)=>1",
      "<T>(a:number,b:number)=>1",

      "a=>1",
      "({})=>1",
      "async ()=>{}",
      "async ()=>await p",
      "async ()=>await new Promise(r=>setTimeout(r))",
    ]);
    is(parse("() => {}"), { result: "()=>{}" });
    is(parse("<T>() => {}"), { result: "()=>{}" });
    // TODO: fix space eating by types
    is(parse("(): T => {}"), { result: "()=>{}" });
    is(parse("(a:T) => {}"), { result: "(a)=>{}" });
  });

  test("classExpression", () => {
    const parse = compile(classExpression);
    expectSame(parse, ["class X{}", "class{}", "class X extends Y{}"]);
    expectSame(parse, [
      "class{}",
      "class{}",
      // "class extends A{}",
      "class{x;}",
      "class{x=1;}",
      "class{x=1;#y=2;}",
      "class{constructor(){}}",
      "class{constructor(){this.val = 1;}}",
      "class{foo(){}}",
      "class{get foo(){}}",
      "class{set foo(){}}",
      "class{async foo(){}}",
      "class{async foo(){}}",
      "class{static async foo(){}}",
    ]);
    is(parse("abstract class{}"), { result: "class{}" });
    is(parse("class { private x; }"), { result: "class{x;}" });
    is(parse("class { public x; }"), { result: "class{x;}" });
    is(parse("class<T>{}"), { result: "class{}" });
    is(parse("class<T> implements X{}"), { result: "class{}" });
    is(parse("class<T> extends C implements X{}"), {
      result: "class extends C{}",
    });
    is(parse("class{foo(): void {} }"), {
      result: "class{foo(){}}",
    });
    is(parse("class{foo(arg:T): void {} }"), {
      result: "class{foo(arg){}}",
    });
    is(parse("class{foo<T>(arg:T): void {} }"), {
      result: "class{foo(arg){}}",
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
      "a+a",
      "1=1",
      "1+1",
      "1*2",
      "((1))",
      "(1)",
      "1*2",
      "1**2",
      "1+(1)",
      "(1)+1",
      "(1+1)+1",
      "(1+1)*1+2/(3/4)",
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
      "a=1",
      "a??b",
      "1+1",
      "(1)",
      "1",
      "(1+1)",
      "1+1+1",
      "(1+(1*2))",
      "((1+1)+(1*2))",
      "await 1",
      "await foo()",
      "(a).x",
      "(a+b).x",
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
      "(a?b:c).d",
      "(a?b:c?d:e).d",
      "a().a()",
      "import('aaa')",
      "(()=>{})()",
      "(async ()=>{})()",
      "a\n.b",
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
    const parse = compile(destructive, { end: true });
    expectSame(
      parse,
      [
        "a",
        "a=1",
        `{a}`,
        `{a:b}`,
        `{a:{b,c}}`,
        `{a:[a]}`,
        "{a=1}",
        "{a:b=1}",
        "{a,...b}",
        "[]",
        "[]",
        "[,,,]",
        "[a]",
        "[,a]",
        "[a,...b]",
        "[a=1,...b]",
        "[,...b]",
        "[[]]",
        "[{}]",
        "[{}={}]",
        "[[a]]",
        "[[a],...x]",
        "[[a,b,[c,d,e],[,g]],,[{x,y}],...x]",
      ],
      { format: false, stripTypes: false }
    );
    expectError(parse, ["a.b", "[a.b]"]);
  });

  /* type annotations */
  test("asExpression", () => {
    const parse = compile(asExpression, { end: true });
    is(parse("1"), { result: "1" });
    is(parse("1 as number"), { result: "1" });
    is(parse("1 + 1 as number"), { result: "1+1" });
    is(parse("(a) as number"), { result: "(a)" });
    is(parse("(a as number)"), { result: "(a)" });
  });

  test("typeExpression", () => {
    const parse = compile(typeExpression, { end: true });
    expectSame(
      parse,
      [
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
        "{ a: number, b?: number }",
        "{ a?: number }",

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
      ],
      { stripTypes: false, format: false }
    );
    // is(
    //   parse(`{

    // }`),
    //   { result: "{\n }" }
    // );
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
    expectSame(parse, [`{return 1;}`, `{debugger;return;}`, "{}"]);
  });
  test("for", () => {
    const parse = compile(forStatement, { end: true });
    expectSame(parse, [
      "for(x=0;x<1;x++)x",
      "for(x=0;x<1;x++){}",
      "for(;;)x",
      "for(let x=1;x<6;x++)x",
      "for(let x=1;x<6;x++){}",
      "for(;;){}",
      "for(;x;x){}",
    ]);
    expectError(parse, ["for(;;)"]);
  });

  test("for-item", () => {
    const parse = compile(forItemStatement, { end: true });
    expectSame(parse, [
      "for(const i of array)x",
      "for(const k in array)x",
      "for(let {} in array)x",
      "for(let {} in [])x",
      "for(let [] in xs){}",
    ]);
    expectError(parse, ["for(const i of t)"]);
  });
  test("while", () => {
    const parse = compile($.seq([whileStatement, $.eof()]));
    expectSame(parse, ["while(1)1", "while(1){break;}"]);
    expectError(parse, ["while(1)"]);
  });

  test("if", () => {
    const parse = compile($.seq([ifStatement, $.eof()]));
    expectSame(parse, [
      "if(1)1",
      `if(1){return 1;}`,
      `if(1){}else 2`,
      `if(1){}else{}`,
      // `if(1){} else if(1) {};`,
      // `if(1){} else if(1)return else 1`,
      `if(1){if(2)return;}`,
    ]);
  });

  test("switch", () => {
    const parse = compile($.seq([switchStatement, $.eof()]));
    expectSame(parse, [
      `switch(x){}`,
      `switch(true){default:1}`,
      `switch(x){case 1:1;case 2:2}`,
      `switch(x){case 1:1;case 2:{}}`,
      `switch(x){case 1: case 2:{}}`,

      // `switch(x){case 1: case 2: {}}`,
      // `switch(x){case 1:case 2:return}`,
      `switch(x){case 1:{}case 2:{}}`,
      `switch(x){case 1:{}default:{}}`,
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
      "const []=[]",
      "const {}={},[]=a",
      // "let x: number = 1",
      "let x:number = 1",
      `let x: any`,
      "let x: number = 1, y: number = 2",
    ]);
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

  test("multiline program control", () => {
    const parse = compile(program, { end: true });
    expectSame(parse, [
      // xxx,
      `a`,
      `a\n`,
      `if(1){}`,
      `if(1){}a`,
      `1;class{}`,
      `1;class{}class{}if(1){}`,
      `a;b`,
      `class {};a;b`,
      `a\n\n`,
      `;;;;;`,
      `    a`,
      ` \n \n a`,
      ` \n \n a; \n b;`,
      ` \n \n a; \n b`,
      ` \n \n a; \n class{}\na`,
      `class{}\na;class{}\n\nb`,
      `class{};a;`,
      `class{}a`,
      `class{}\n`,
      `class{}\n;`,
      `class{};\n;`,
      `class{}\na;`,
      `class{}\n\na;`,
      `class{};\na;`,
      `class{}\n;\na`,
      `if(1){}a`,
      `if(1){};a`,
      `if(1){}\n;a`,
      `if(1){}\n;\na`,
      `if(1){}\n\na`,
      `if(1){} else {}\n\na`,
      `if(1){} else {}\na;`,
      `type X = { xxx: number }`,
      // `type X = { xxx?: number }`,

      "f(() => 1);",
      "f(1, () => {});",
      "f(1, (a) => {});",
      "f(1, (a,b) => {});",
      "f(1, (a,b,c) => {});",
      `function f(){
        return input.replace(/@(W|L|N)(\d+)\}/, (full, x, y) => {});
      }`,
      `function _formatError(depth: number) {}`,
      `function _formatError(depth: number = 0) {}`,
      `"".foo`,
      `/x/.exec`,
      `f(1, 2, 3)`,
      `new Error()`,
      `new A.b()`,
      `throw new Error();`,
      `function a(a){}`,
      `class{
        public foo(x, {}: {} = {}){}
      }`,
      // `class{
      //   foo(x,){}
      // }`,
      `class{
        foo(
          x,
        ){}
      }`,
      `class{
        public async foobar(x, {}: {} = {}){}
      }`,
      `({...a, ...b})`,
      // `f({\n })`,
      `function f(a={\n }){}`,
      `class{f(a={\n}){}}`,
      `class{f(a={\n}){\n}}`,

      `class{f(a={\n\n}){}}`,
      `class{f(a={\n }){}}`,
      // `class{f({}:{}={\n }){}}`,

      // `const el = document.querySelector("#app");`,
      // "do.querySelector",
      // `document.query;`,
      // `document.querySelector`,
    ]);
  });

  run({ stopOnFail: true, stub: true, isMain });
}
