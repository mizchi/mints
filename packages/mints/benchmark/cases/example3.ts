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
    $.not($.or([...RESERVED_WORDS])),
    $.r`([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)`,
    $.regex(`(?!(${reserved})$)([a-zA-Z_$][a-zA-Z_$0-9]*)`),
  ]),
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
  ]),
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
  ]),
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
  ]),
);

const typeParen = $.def(() =>
  $.seq(["(", _, typeExpression, _, ")", _, $.opt(typeParameters)]),
);

const typeIdentifier = $.def(() =>
  $.or([
    "a",
    "void",
    "any",
    "unknown",
    $.seq([identifier, _, $.opt(typeParameters)]),
  ]),
);

const typePrimary = $.def(() =>
  $.or([typeParen, typeObjectLiteral, typeArrayLiteral, typeIdentifier]),
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
  ]),
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
  ]),
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
  ]),
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
  ]),
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
      $.opt($.seq([_, "?"])),
      _,
      $.or([":", "?:"]),
      // ":",
      _,
      typeExpression,
    ]),
  ]),
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
  ]),
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
  ]),
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
  ]),
);

const typeUnaryExpression = $.def(() =>
  $.seq([
    $.opt($.seq([$.r`(keyof|typeof|infer)`, __])),
    $.or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
    // generics parameter
  ]),
);

const typeBinaryExpression = $.def(() =>
  $.seq([
    $["*"]([typeUnaryExpression, _, $.or(["|", "&"]), _]),
    typeUnaryExpression,
  ]),
);

const typeExpression = $.def(() => $.or([typeBinaryExpression]));

// /*
//   patterns
// */

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
  ]),
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
  ]),
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
  ]),
);

export const destructive = $.def(() =>
  $.seq([
    $.or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    // { a = 1 } = {}
    $.opt($.seq([_s, assign])),
  ]),
);

export const destructiveNoAssign = $.def(() =>
  $.or([
    // {} | [] | a
    destructiveObjectPattern,
    destructiveArrayPattern,
    identifier,
  ]),
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
  ]),
);
// const lefthand = $.def(() => destructivePattern);

// const x = $.opt(destructivePattern);

const functionArguments = $.def(() =>
  $.or([
    // a,b,c
    $.seq([
      $["*"]([functionArgWithAssign, _s, ",", _s]),
      _s,
      $.or([
        // rest spread
        $.seq([REST_SPREAD, _s, functionArgWithAssign]),
        functionArgWithAssign,
        _s,
      ]),
      _s,
      $.opt(","),
      _s,
    ]),
    // one item
    $.seq([
      $.or([
        $.seq([REST_SPREAD, _s, functionArgWithAssign]),
        functionArgWithAssign,
        _s,
      ]),
      _s,
      $.opt(","),
      _s,
    ]),

    // x,\n
    $.seq([identifier, _s, $.opt(","), _s]),
  ]),
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
  ]),
);

// /* Expression */

export const stringLiteral = $.def(() =>
  $.or([
    // double quote
    $.r`("[^"\\n]*")`,
    // single
    $.r`('[^'\\n]*')`,
  ]),
);

const nonBacktickChars = "[^`]*";

export const templateLiteral = $.def(() =>
  $.seq([
    "`",
    // aaa${}
    $["*"]([$.regex(nonBacktickChars), "${", _, anyExpression, _, "}"]),
    $.regex(nonBacktickChars),
    "`",
  ]),
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
  ]),
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
        ]),
      ),
      _,
      $.or([$.opt<any>(restSpread), anyExpression, _]),
      _,
      "]",
    ]),
  ]),
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
  ]),
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
  ]),
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
  ]),
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
      _s,
      functionArguments,
      _s,
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
      // class member
      $.seq([
        // foo(): void {}
        "(",
        _s,
        functionArguments,
        _s,
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
  ]),
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
  ]),
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
  ]),
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
  ]),
);

const newExpression = $.def(() =>
  $.seq([
    "new ",
    memberable,
    _s,
    $.opt($.seq(["(", _s, functionArguments, _s, ")"])),
  ]),
);

const paren = $.def(() =>
  $.seq(["\\(", _s, anyExpression, _s, "\\)", $.not("=>")]),
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
  ]),
);

const memberAccess = $.def(() =>
  $.or([
    // ?. | .#a | .a
    $.seq([_s, $.r`(\\?)?\\.`, $.r`\\#?`, identifier]),
    $.seq([_s, $.r`(\\?\\.)?`, "[", _s, anyExpression, _s, "]"]),
    __call,
  ]),
);

const memberable = $.def(() =>
  $.or([$.seq([primary, $.repeat(memberAccess)]), anyLiteral]),
);

// call chain access and member access
const accessible = $.def(() =>
  $.or([
    // call chain
    $.seq([memberable, _s, __call, _s, $["*"]([memberAccess])]),
    memberable,
  ]),
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
  ]),
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
  ]),
);

/* TypeExpression */

const asExpression = $.def(() =>
  $.seq([
    // foo as Type
    binaryExpression,
    $.skip_opt<any>($.seq([__, "as", __, typeExpression])),
  ]),
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
  ]),
);

export const anyExpression = $.def(() =>
  $.or([ternaryExpression, asExpression]),
);

const _typeAnnotation = $.seq([":", _, typeExpression]);
// const emptyStatement = $.def(() => $.seq([$.r`(\\s)*`]));
const breakStatement = $.def(() => "break");
const debuggerStatement = $.def(() => "debugger");

const returnStatement = $.def(() =>
  $.seq([$.r`(return|yield)`, $.opt($.seq([__, anyExpression]))]),
);

const throwStatement = $.def(() => $.seq(["throw", __, anyExpression]));

const blockOrStatement = $.def(() => $.or([block, anyStatement]));

const blockStatement = $.def(() => block);

const labeledStatement = $.def(() =>
  $.seq([identifier, _s, ":", _s, anyStatement]),
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
          ]),
        ),
        _s,
        "}",
      ]),
    ]),
    __,
    "from",
    __,
    stringLiteral,
  ]),
);

const importStatement = $.def(() =>
  $.or([
    // import 'specifier';
    $.seq(["import", __, stringLiteral]),
    // import type
    $.seq([$.skip($.seq(["import", __, "type", __, _importRightSide]))]),
    // import pattern
    $.seq(["import", __, _importRightSide]),
  ]),
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
        ]),
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
  ]),
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
      ]),
    ),
  ]),
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
        ]),
      ),
      _s,
    ]),
    _s,
    $.opt($.seq(["default", _s, ":", _s, blockOrStatement])),
    _s,
    "}",
  ]),
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
  ]),
);

const declareVariableStatement = $.def(() =>
  $.seq([$.skip($.seq(["declare", __, variableStatement]))]),
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
      ]),
    ),
  ]),
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
      ]),
    ),
  ]),
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
  ]),
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
  ]),
);

export const whileStatement = $.def(() =>
  $.seq(["while", _s, "(", _s, anyExpression, _s, ")", _s, blockOrStatement]),
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
  ]),
);

const expressionStatement = $.def(() =>
  $.seq([anyExpression, $["*"]([",", _s, anyExpression])]),
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
  ]),
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
  ]),
);

const lines = $.seq([
  $["*"]([
    $.or([
      $.seq([
        // class{}(;\n)
        semicolonlessStatement,
        $.or([$.skip($.tok("\n")), $.tok(";"), $.skip(_)]),
      ]),
      $.seq([$.opt(anyStatement), _, $.r`[;\\n]+`, _]),
      $.seq([
        // enter or semicolon end statements
        $.opt(anyStatement),
        $.r`[ ]*`,
        $.r`[\\n;]`,
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
import { expectError, expectSame } from "./_testHelpers";
import { preprocessLight } from "./preprocess";
import { ErrorType, ParseError } from "../../pargen/src/types";
import { reportError } from "../../pargen/src/error_reporter";
