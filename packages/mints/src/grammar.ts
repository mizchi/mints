import {
  $def,
  $eof,
  $not,
  $opt,
  $or,
  $pairClose,
  $pairOpen,
  $r,
  $regex,
  $repeat,
  $repeat_seq,
  $repeat_seq1,
  $seq,
  $skip,
  $skip_opt,
  $token,
} from "../../pargen/src/builder";

import {
  K_ABSTRACT,
  K_AS,
  K_ASYNC,
  K_AWAIT,
  K_BLACE_CLOSE,
  K_BLACE_OPEN,
  K_BREAK,
  K_CASE,
  K_CATCH,
  K_CLASS,
  K_CONST,
  K_CONSTRUCTOR,
  K_DEBUGGER,
  K_DECLARE,
  K_DEFAULT,
  K_DELETE,
  K_DO,
  K_ELSE,
  K_ENUM,
  K_EXPORT,
  K_EXTENDS,
  K_FALSE,
  K_FINALLY,
  K_FOR,
  K_FROM,
  K_FUNCTION,
  K_GET,
  K_IF,
  K_IMPLEMENTS,
  K_IMPORT,
  K_INTERFACE,
  K_LET,
  K_NEW,
  K_NULL,
  K_PAREN_CLOSE,
  K_PAREN_OPEN,
  K_PRIVATE,
  K_PROTECTED,
  K_PUBLIC,
  K_QUESTION,
  K_READONLY,
  K_RETURN,
  K_SET,
  K_STATIC,
  K_SWITCH,
  K_THIS,
  K_THROW,
  K_TRUE,
  K_TRY,
  K_TYPE,
  K_TYPEOF,
  K_VAR,
  K_VOID,
  K_WHILE,
  K_YIELD,
  OPERATORS,
  RESERVED_WORDS,
  REST_SPREAD,
  SPACE_REQUIRED_OPERATORS,
  _ as _w,
  __ as __w,
} from "./constants";

import { compile } from "./ctx";

const _ = $regex(_w);
const _s = $skip($regex(_w));
const __ = $regex(__w);
// const _ = $def(() => $regex(_w));
// const _s = $def(() => $skip($regex(_w)));
// const __ = $def(() => $regex(__w));

const reserved = RESERVED_WORDS.join("|");
export const identifier = $def(() =>
  $seq([$regex(`(?!(${reserved})$)([a-zA-Z_$][a-zA-Z_$\\d]*)`)])
);

const ThisKeyword = $token(K_THIS);
const ImportKeyword = $token(K_IMPORT);

// const BINARY_OPS = K_PAREN_OPEN + OPERATORS.join("|") + K_PAREN_CLOSE;

const typeDeclareParameter = $def(() =>
  $seq([
    typeExpression,
    // extends T
    $opt($seq([_, K_EXTENDS, __, typeExpression])),
    _,
    $opt($seq(["=", $not([">"]), _, typeExpression])),
  ])
);

// declare parameters
const typeDeclareParameters = $def(() =>
  $seq([
    "<",
    _,
    $repeat_seq([typeDeclareParameter, _, ",", _]),
    $seq([typeDeclareParameter, _, $opt(",")]),
    _,
    ">",
  ])
);

// apply parameters
const typeParameters = $def(() =>
  $seq([
    "<",
    _,
    $repeat_seq([typeExpression, _, ",", _]),
    $seq([typeExpression, _, $r`,?`]),
    _,
    ">",
  ])
);

const typeParen = $def(() =>
  $seq([
    K_PAREN_OPEN,
    _,
    typeExpression,
    _,
    K_PAREN_CLOSE,
    _,
    $opt(typeParameters),
  ])
);

const typeIdentifier = $def(() =>
  $seq([
    $not([$seq([K_READONLY, __])]),
    $or([
      // "readonly",
      K_VOID,
      $seq([identifier, _, $opt(typeParameters)]),
    ]),
  ])
);

const typePrimary = $def(() =>
  $or([typeParen, typeObjectLiteral, typeArrayLiteral, typeIdentifier])
);

const typeReference = $def(() =>
  $seq([
    typePrimary,
    $repeat_seq([
      _,
      $or([
        $seq([".", _, typeIdentifier]),
        $seq(["[", _, $opt(typeExpression), _, "]"]),
      ]),
    ]),
  ])
);

const _typeNameableItem = $def(() =>
  $or([
    $seq([
      // start: number,
      identifier,
      $opt($seq([_, K_QUESTION])),
      _,
      ":",
      _,
      typeExpression,
      _,
    ]),
    typeExpression,
  ])
);

const typeArrayLiteral = $def(() =>
  $seq([
    // array
    "[",
    _,
    // repeat
    $repeat_seq([_typeNameableItem, _, ",", _]),
    _,
    // optional last
    $or([
      $seq([
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

const typeFunctionArgs = $def(() =>
  $seq([
    $repeat_seq([
      // args
      identifier,
      _,
      $opt(K_QUESTION),
      ":",
      _,
      typeExpression,
      _,
      ",",
      _,
    ]),
    $or([
      // last
      $seq([REST_SPREAD, _, identifier, _, ":", _, typeExpression]),
      $seq([
        identifier,
        _,
        $opt(K_QUESTION),
        ":",
        _,
        typeExpression,
        _,
        $opt(","),
      ]),
      _,
    ]),
  ])
);

const typeObjectItem = $def(() =>
  $or([
    $seq([
      // async foo<T>(arg: any): void;
      $opt($seq([K_ASYNC, __])),
      identifier,
      _,
      $opt(typeDeclareParameters),
      _,
      K_PAREN_OPEN,
      _,
      typeFunctionArgs,
      _,
      K_PAREN_CLOSE,
      _,
      $opt(K_QUESTION),
      ":",
      _,
      typeExpression,
    ]),
    // member
    $seq([
      $opt($seq([K_READONLY, __, _s])),
      identifier,
      _,
      $opt(K_QUESTION),
      ":",
      // ":",
      _,
      typeExpression,
    ]),
  ])
);

const typeObjectLiteral = $def(() =>
  $seq([
    // object
    K_BLACE_OPEN,
    _,
    $repeat_seq([typeObjectItem, _, $or([",", ";"]), _]),
    $opt(typeObjectItem),
    _,
    // $r`(,|;)?`,
    $or([",", ";", _]),
    _,
    K_BLACE_CLOSE,
  ])
);

const typeLiteral = $def(() =>
  $or([
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

const typeFunctionExpression = $def(() =>
  $seq([
    // function
    $opt(typeDeclareParameters),
    _,
    K_PAREN_OPEN,
    _,
    typeFunctionArgs,
    _,
    K_PAREN_CLOSE,
    _,
    "=>",
    _,
    // return type
    typeExpression,
  ])
);

const typeUnaryExpression = $def(() =>
  $seq([
    $opt($seq([$or(["keyof", K_TYPEOF, "infer"]), __])),
    $or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
    // generics parameter
  ])
);

// const typeSep = ;
const typeBinaryExpression = $def(() =>
  $seq([
    $opt($or(["|", "&"])),
    // _,
    $repeat_seq([
      typeUnaryExpression,
      $or([$seq([_, "|", _]), $seq([_, "&", _]), $seq([_, "is", __])]),
    ]),
    typeUnaryExpression,
  ])
);

const typeExpression = $def(() => typeBinaryExpression);

/*
  patterns
*/

// Destructive Pattren
const destructiveArrayPattern = $def(() =>
  $seq([
    "[",
    _s,
    $repeat_seq([
      // item, {},,
      $opt($seq([destructive, _s, $opt($seq([_s, assign]))])),
      _s,
      ",",
      _s,
    ]),
    $or([
      // [,...i]
      $seq([REST_SPREAD, _, identifier]),
      // [,a = 1 ,]
      $seq([destructive, _s, $opt($seq([_s, assign])), $opt(",")]),
      $seq([_, $opt(",")]),
    ]),
    _,
    "]",
  ])
);

const destructiveObjectItem = $def(() =>
  $or([
    $seq([
      // a : b
      identifier,
      _s,
      $opt($seq([":", _s, destructive])),
      // a: b = 1,
      $opt($seq([_s, assign])),
    ]),
  ])
);

const destructiveObjectPattern = $def(() =>
  $seq([
    K_BLACE_OPEN,
    _s,
    $repeat_seq([destructiveObjectItem, _, ",", _]),
    $or([
      // ...
      $seq([REST_SPREAD, _, identifier]),
      destructiveObjectItem,
      _s,
    ]),
    _s,
    K_BLACE_CLOSE,
  ])
);

const destructive = $def(() =>
  $seq([
    $or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    // { a = 1 } = {}
    $opt($seq([_s, assign])),
  ])
);

const functionArgWithAssign = $def(() =>
  $seq([
    $or([
      // pattern(:T)?
      destructiveObjectPattern,
      destructiveArrayPattern,
      identifier,
    ]),
    $skip_opt(
      $seq([
        _,
        $skip_opt(K_QUESTION),
        $skip_opt(K_QUESTION),
        ":",
        _,
        typeExpression,
      ])
    ),
    $opt($seq([_, $skip_opt(K_QUESTION), "=", $not([">"]), _, anyExpression])),
  ])
);
// const lefthand = $def(() => destructivePattern);

// const x = $opt(destructivePattern);

const functionArguments = $def(() =>
  $or([
    // a,b,c
    $seq([
      $repeat_seq([functionArgWithAssign, _s, ",", _s]),
      _s,
      $or([
        // rest spread
        $seq([REST_SPREAD, _s, functionArgWithAssign]),
        functionArgWithAssign,
        _s,
      ]),
      _s,
      $opt(","),
      _s,
    ]),
    // one item
    $seq([
      $or([
        $seq([REST_SPREAD, _s, functionArgWithAssign]),
        functionArgWithAssign,
        _s,
      ]),
      _s,
      $opt(","),
      _s,
    ]),

    // x,\n
    $seq([identifier, _s, $opt(","), _s]),
  ])
);

const callArguments = $def(() =>
  $seq([
    $repeat_seq([anyExpression, _s, ",", _s]),
    _s,
    $or([
      // rest spread
      $seq([REST_SPREAD, _s, anyExpression]),
      anyExpression,
      _s,
    ]),
  ])
);

/* Expression */

const stringLiteral = $def(() =>
  $or([
    // double quote
    $r`("[^"\\n]*")`,
    // single
    $r`('[^'\\n]*')`,
  ])
);

const nonBacktickChars = "[^`]*";

const templateLiteral = $def(() =>
  $seq([
    "`",
    // aaa${}
    $repeat_seq([
      $regex(nonBacktickChars),
      "${",
      _,
      anyExpression,
      _,
      K_BLACE_CLOSE,
    ]),
    $regex(nonBacktickChars),
    "`",
  ])
);

const regexpLiteral = $def(() => $seq([$r`\\/[^\\/]+\\/([igmsuy]*)?`]));

// TODO: 111_000
// TODO: 0b1011
const numberLiteral = $def(() =>
  $or([
    // 16
    $r`(0(x|X)[0-9a-fA-F]+)`,
    // 8
    $r`(0(o|O)[0-7]+)`,
    // 2
    $r`(0(b|B)[0-1]+)`,
    // decimal
    $r`([1-9][0-9_]*\\.\\d+|[1-9][0-9_]*|\\d)(e\\-?\\d+)?`,
  ])
);

const booleanLiteral = $def(() => $or([K_TRUE, K_FALSE]));
const nullLiteral = $def(() => K_NULL);

const restSpread = $def(() => $seq([REST_SPREAD, _, anyExpression]));

const arrayLiteral = $def(() =>
  $or([
    $seq([
      "[",
      $repeat(
        $seq([_, $or([$opt<any>(restSpread), anyExpression, _]), _, ","])
      ),
      _,
      $or([$opt<any>(restSpread), anyExpression, _]),
      _,
      "]",
    ]),
  ])
);

// key: val
const objectItem = $def(() =>
  $or([
    $seq([
      // function
      $opt($seq([$or([K_ASYNC, K_GET, K_SET]), __])),
      $or([stringLiteral, $seq(["[", _s, anyExpression, _s, "]"]), identifier]),
      $seq([
        _s,
        K_PAREN_OPEN,
        _s,
        functionArguments,
        _s,
        K_PAREN_CLOSE,
        _s,
        block,
      ]),
    ]),
    $seq([
      // value
      $or([
        // key:
        stringLiteral,
        // [key]:
        $seq(["[", _s, anyExpression, _s, "]"]),
        // a
        identifier,
      ]),
      // value or shorthand
      $seq([_s, ":", _s, anyExpression]),
    ]),
    // rest spread
    $seq([REST_SPREAD, _s, anyExpression]),
    // shothand
    identifier,
  ])
);

// ref by key
const objectLiteral = $def(() =>
  $seq([
    K_BLACE_OPEN,
    _s,
    $repeat($seq([objectItem, _s, ",", _s])),
    _s,
    // $opt($or([restSpread, objectItem])),
    $or([$opt<any>(restSpread), objectItem, _s]),
    _s,
    K_BLACE_CLOSE,
  ])
);

const anyLiteral = $def(() =>
  $or([
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
const accessModifier = $regex(`(${K_PRIVATE}|${K_PUBLIC}|${K_PROTECTED}) `);
// const accessModifier = $or([K_PRIVATE,K_PUBLIC,K_PROTECTED]);

// const staticModifier = $token(`static `);
// const readonlyModifier = $token(`readonly `);
const staticModifier = $seq([K_STATIC, __]);
const asyncModifier = $seq([K_ASYNC, __]);
const getOrSetModifier = $seq([$or([K_GET, K_SET]), __]);

const classConstructorArg = $def(() =>
  $seq([
    $or([
      // private
      $seq([$or([K_PRIVATE, K_PUBLIC, K_PROTECTED]), __, identifier]),
      // normal initializer
      $seq([
        $or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
      ]),
    ]),
    $seq([
      $skip_opt(
        $seq([_, $opt(K_QUESTION), $opt(K_QUESTION), ":", _, typeExpression])
      ),
      $opt(
        $seq([_, $skip_opt(K_QUESTION), "=", $not([">"]), _, anyExpression])
      ),
    ]),
  ])
);
const classConstructor = $def(() =>
  $seq(
    [
      $skip_opt(accessModifier),
      $token(K_CONSTRUCTOR),
      _s,
      K_PAREN_OPEN,
      ["args", $repeat($seq([_s, classConstructorArg, _s, $skip(","), _s]))],
      ["last", $opt($seq([_s, classConstructorArg, _s, $skip_opt(",")]))],
      _s,
      K_PAREN_CLOSE,
      _s,
      K_BLACE_OPEN,
      _s,
      ["body", lines],
      _s,
      K_BLACE_CLOSE,
    ],
    (input: { args: string[]; last: string; body: string }) => {
      // const inits: string[] = [];
      let bodyIntro = "";
      let args = [];
      for (const arg of [...input.args, ...(input.last ? [input.last] : [])]) {
        const [, initOnBody, ident, assign] =
          arg.match(/(private |public |protected )?([^=,]+)(=.+)?$/msu)! ?? [];
        args.push(`${ident}${assign ?? ""}`);
        if (initOnBody) {
          bodyIntro += `${K_THIS}.${ident}=${ident};`;
        }
      }
      return `${K_CONSTRUCTOR}(${args.join(",")}){${bodyIntro}${input.body}}`;
    }
  )
);

const classField = $def(() =>
  $or([
    classConstructor,
    // class member
    $seq([
      $skip_opt(accessModifier),
      $opt(staticModifier),
      $opt($seq([K_ASYNC, __])),
      $opt(getOrSetModifier),
      $opt("*"),
      $opt("#"),
      identifier,
      // <T>
      $skip_opt($seq([_, typeDeclareParameters])),
      _,
      // class member
      $seq([
        // foo(): void {}
        K_PAREN_OPEN,
        _s,
        functionArguments,
        _s,
        K_PAREN_CLOSE,
        $skip_opt($seq([_, _typeAnnotation])),
        _s,
        block,
      ]),
    ]),
    // field
    $seq([
      // private|static|readonly
      $skip_opt(accessModifier),
      // static
      $opt(staticModifier),
      $skip_opt($seq([K_READONLY, __])),
      $opt($seq([_s, "#"])),
      identifier,
      // :xxx
      $skip_opt($seq([_s, _typeAnnotation])),
      _s,
      $opt($seq(["=", $not([">"]), _s, anyExpression])),
      ";",
    ]),
  ])
);

const classExpression = $def(() =>
  $seq([
    $skip_opt<any>($seq([K_ABSTRACT, __])),
    K_CLASS,
    $opt($seq([__, identifier])),
    // <T>
    $skip_opt(typeDeclareParameters),
    $opt($seq([__, K_EXTENDS, __, anyExpression])),
    $skip_opt($seq([__, K_IMPLEMENTS, __, typeExpression])),
    _s,
    K_BLACE_OPEN,
    _s,
    $repeat_seq([_s, classField, _s]),
    _s,
    // TODO: class field
    K_BLACE_CLOSE,
  ])
);

const functionExpression = $def(() =>
  $seq([
    $opt(asyncModifier),
    K_FUNCTION,
    $opt($seq([_s, "*"])),
    $opt($seq([__, identifier])),
    _s,
    $skip_opt(typeDeclareParameters),
    _s,
    K_PAREN_OPEN,
    _s,
    functionArguments,
    _s,
    K_PAREN_CLOSE,
    _s,
    $skip_opt(_typeAnnotation),
    _s,
    $or([block, anyStatement]),
  ])
);

const arrowFunctionExpression = $def(() =>
  $seq([
    $opt(asyncModifier),
    $skip_opt(typeDeclareParameters),
    _s,
    $opt("*"),
    _s,
    $or([
      $seq([
        K_PAREN_OPEN,
        _s,
        functionArguments,
        _s,
        K_PAREN_CLOSE,
        $skip_opt($seq([_, _typeAnnotation])),
      ]),
      identifier,
    ]),
    _s,
    "=>",
    _s,
    $or([block, anyStatement]),
  ])
);

const newExpression = $def(() =>
  $seq([
    K_NEW,
    __,
    memberable,
    _s,
    $opt($seq([K_PAREN_OPEN, _s, functionArguments, _s, K_PAREN_CLOSE])),
  ])
);

const paren = $def(() =>
  $seq([K_PAREN_OPEN, _s, anyExpression, _s, K_PAREN_CLOSE, $not(["=>"])])
);
const primary = $or([
  paren,
  newExpression,
  objectLiteral,
  stringLiteral,
  regexpLiteral,
  templateLiteral,
  identifier,
  // should be after identifier
  ThisKeyword,
  ImportKeyword,
]);

const __call = $def(() =>
  $or([
    $seq([
      "?.",
      $skip_opt($seq([_, typeParameters])),
      _s,
      K_PAREN_OPEN,
      _s,
      callArguments,
      _s,
      K_PAREN_CLOSE,
    ]),
    $seq([
      $skip_opt($seq([_, typeParameters])),
      _,
      K_PAREN_OPEN,
      _,
      callArguments,
      _,
      K_PAREN_CLOSE,
    ]),
  ])
);

const memberAccess = $def(() =>
  $or([
    // ?. | !. | .
    $seq([_s, $or(["!.", "?.", "."]), $opt($seq([_s, "#"])), identifier]),

    // $seq([_s, $r`(\\?)?\\.`, $r`\\#?`, identifier]),
    $seq([
      _s,
      // ?.
      $opt($seq(["?.", _s])),
      "[",
      _s,
      anyExpression,
      _s,
      "]",
    ]),
    __call,
  ])
);

const memberable = $def(() =>
  $or([$seq([primary, $repeat(memberAccess)]), anyLiteral])
);

// call chain access and member access
const accessible = $def(() =>
  $or([
    // call chain
    $seq([memberable, _s, __call, _s, $repeat_seq([memberAccess])]),
    memberable,
  ])
);

const unary = $def(() =>
  $or([
    // with unary prefix
    $seq([
      $or([
        "++",
        "--",
        $seq([$or([K_VOID, K_AWAIT, K_TYPEOF, K_DELETE]), __]),
        "~",
        "!",
      ]),
      unary,
    ]),
    $seq([$or([accessible, paren]), templateLiteral]),
    $seq([
      $or([
        classExpression,
        functionExpression,
        arrowFunctionExpression,
        accessible,
        paren,
      ]),
      $opt($or(["++", "--"])),
      // ts bang operator
      $skip_opt("!"),
    ]),
  ])
);

const binaryExpression = $def(() =>
  $seq([
    unary,
    $repeat_seq([
      $or([
        ...SPACE_REQUIRED_OPERATORS.map((op) => $seq([__, op, __])),
        ...OPERATORS.map((op) => $seq([_s, op, _s])),
      ]),
      unary,
    ]),
  ])
);

/* TypeExpression */

const asExpression = $def(() =>
  $seq([
    // foo as Type
    binaryExpression,
    $skip_opt<any>($seq([__, K_AS, __, typeExpression])),
  ])
);

// a ? b: c
const ternaryExpression = $def(() =>
  $seq([
    asExpression,
    _s,
    K_QUESTION,
    _s,
    anyExpression,
    _s,
    ":",
    _s,
    anyExpression,
  ])
);

export const anyExpression = $def(() => $or([ternaryExpression, asExpression]));

const _typeAnnotation = $seq([":", _, typeExpression]);
// const emptyStatement = $def(() => $seq([$r`(\\s)*`]));
const breakStatement = $def(() => K_BREAK);
const debuggerStatement = $def(() => K_DEBUGGER);

const returnStatement = $def(() =>
  $seq([$or([K_RETURN, K_YIELD]), $opt($seq([__, anyExpression]))])
);

const throwStatement = $def(() => $seq([K_THROW, __, anyExpression]));

const blockOrStatement = $def(() => $or([block, anyStatement]));

const blockStatement = $def(() => block);

const labeledStatement = $def(() =>
  $seq([identifier, _s, ":", _s, anyStatement])
);

const _importRightSide = $def(() =>
  $seq([
    $or([
      // default only
      $seq([__, identifier, __]),
      $seq([_s, "*", _s, K_AS, __, identifier, __]),
      // TODO: * as b
      $seq([
        _s,
        K_BLACE_OPEN,
        _s,
        $repeat_seq([
          identifier,
          $opt($seq([__, K_AS, __, identifier])),
          _s,
          ",",
          _s,
        ]),
        // last item
        $opt(
          $seq([identifier, $opt($seq([__, K_AS, __, identifier, _s, $r`,?`]))])
        ),
        _s,
        K_BLACE_CLOSE,
        _s,
      ]),
    ]),
    _s,
    // __,
    K_FROM,
    _s,
    stringLiteral,
  ])
);

const importStatement = $def(() =>
  $or([
    // import 'specifier';
    $seq([K_IMPORT, _s, stringLiteral]),
    // import type
    $seq([$skip($seq([K_IMPORT, __, K_TYPE, _importRightSide]))]),
    // import pattern
    $seq([K_IMPORT, _importRightSide]),
  ])
);

const defaultOrIdentifer = $or([K_DEFAULT, identifier]);

const exportStatement = $def(() =>
  $or([
    // TODO: skip: export type|interface
    // export clause
    $seq([
      K_EXPORT,
      _s,
      K_BLACE_OPEN,
      _s,
      $repeat_seq([
        defaultOrIdentifer,
        $opt($seq([__, K_AS, __, defaultOrIdentifer])),
        _s,
        ",",
        _s,
      ]),
      // last item
      $opt(
        $seq([
          defaultOrIdentifer,
          $opt($seq([__, K_AS, __, defaultOrIdentifer])),
          $opt(","),
        ])
      ),
      _s,
      K_BLACE_CLOSE,
      $opt($seq([_s, K_FROM, __, stringLiteral])),
    ]),
    // export named expression
    $seq([
      K_EXPORT,
      __,
      $or([variableStatement, functionExpression, classExpression]),
    ]),
  ])
);

const ifStatement = $def(() =>
  // $or([
  $seq([
    // if
    K_IF,
    _s,
    K_PAREN_OPEN,
    _s,
    anyExpression,
    _s,
    K_PAREN_CLOSE,
    _s,
    blockOrStatement,
    _s,
    $opt(
      $seq([
        K_ELSE,
        $or([
          // xx
          $seq([_s, block]),
          $seq([__, anyStatement]),
        ]),
      ])
    ),
  ])
);

const switchStatement = $def(() =>
  $seq([
    K_SWITCH,
    _s,
    K_PAREN_OPEN,
    _s,
    anyExpression,
    _s,
    K_PAREN_CLOSE,
    _s,
    K_BLACE_OPEN,
    _s,
    $repeat_seq([
      $repeat_seq1([K_CASE, __, anyExpression, _s, ":", _s]),
      $opt(
        $or([
          $seq([
            // xxx
            $or([block, caseClause]),
            _s,
            $opt(";"),
          ]),
          lines,
        ])
      ),
      _s,
    ]),
    _s,
    $opt($seq([K_DEFAULT, _s, ":", _s, $or([block, caseClause])])),
    _s,
    K_BLACE_CLOSE,
  ])
);

const assign = $def(() => $seq(["=", $not([">"]), _s, anyExpression]));
const variableStatement = $def(() =>
  $seq([
    // single
    $seq([declareType, __]),
    // x, y=1,
    $repeat_seq([
      destructive,
      _s,
      $skip_opt(_typeAnnotation),
      $opt($seq([_s, assign])),
      _s,
      ",",
      _s,
    ]),
    _s,
    destructive,
    _s,
    $skip_opt(_typeAnnotation),
    $opt($seq([_s, assign])),
  ])
);

const declareVariableStatement = $def(() =>
  $seq([$skip($seq([K_DECLARE, __, variableStatement]))])
);

const typeStatement = $def(() =>
  $seq([
    $skip(
      $seq([
        $opt($seq([K_EXPORT, __])),
        K_TYPE,
        __,
        identifier,
        _,
        "=",
        $not([">"]),
        _,
        typeExpression,
      ])
    ),
  ])
);

const interfaceStatement = $def(() =>
  $seq([
    // skip all
    $skip(
      $seq([
        $opt($seq([K_EXPORT, __])),
        K_INTERFACE,
        __,
        identifier,
        $opt($seq([__, K_EXTENDS, __, typeExpression])),
        _,
        typeObjectLiteral,
      ])
    ),
  ])
);

const forStatement = $def(() =>
  $seq([
    K_FOR,
    _s,
    K_PAREN_OPEN,
    _s,
    // start
    $or([variableStatement, anyExpression, _]),
    _s,
    ";",
    // condition
    _s,
    $opt(anyExpression),
    _s,
    ";",
    // step end
    $opt(anyExpression),
    K_PAREN_CLOSE,
    _s,
    blockOrStatement,
  ])
);

// include for in / for of

const declareType = $or([K_VAR, K_CONST, K_LET]);

const forItemStatement = $def(() =>
  $seq([
    K_FOR,
    _s,
    K_PAREN_OPEN,
    _s,
    $seq([$or([K_VAR, K_LET, K_CONST]), __]),
    _s,
    destructive,
    __,
    $or(["of", "in"]),
    __,
    anyExpression,
    _s,
    K_PAREN_CLOSE,
    _s,
    blockOrStatement,
  ])
);

const whileStatement = $def(() =>
  $seq([
    K_WHILE,
    _s,
    K_PAREN_OPEN,
    _s,
    anyExpression,
    _s,
    K_PAREN_CLOSE,
    _s,
    blockOrStatement,
  ])
);

const doWhileStatement = $def(() =>
  $or([
    $seq([
      K_DO,
      $or([$seq([_s, block]), $seq([__, anyStatement])]),
      _,
      K_WHILE,
      _s,
      K_PAREN_OPEN,
      _s,
      anyExpression,
      _s,
      K_PAREN_CLOSE,
    ]),
  ])
);

// try{}finally{};
const _finally = $def(() => $seq([K_FINALLY, _s, block]));
const tryCatchStatement = $def(() =>
  $or([
    $seq([
      // try
      K_TRY,
      _s,
      block,
      _s,
      $or([
        $seq([
          K_CATCH,
          $opt($seq([_s, K_PAREN_OPEN, _s, anyExpression, _s, K_PAREN_CLOSE])),
          _s,
          block,
          $opt($seq([_s, _finally])),
        ]),
        _finally,
      ]),
    ]),
  ])
);

const enumAssign = $def(() =>
  $seq([_s, $skip("="), _s, $or([numberLiteral, stringLiteral])])
);

const enumStatement = $def(() =>
  $seq(
    [
      K_ENUM,
      __,
      ["enumName", identifier],
      _,
      K_BLACE_OPEN,
      _,
      // first define enum base
      [
        "items",
        $repeat_seq([
          //
          ["ident", identifier],
          ["assign", $opt(enumAssign)],
          _s,
          $skip(","),
          _s,
        ]),
      ],
      [
        "last",
        $opt(
          $seq([
            ["ident", identifier],
            ["assign", $opt(enumAssign)],
            _s,
            $skip_opt(","),
          ])
        ),
      ],
      _,
      K_BLACE_CLOSE,
    ],
    (input: {
      enumName: string;
      items: Array<{ ident: string; assign?: string }>;
      last?: { ident: string; assign?: string };
    }) => {
      let baseValue = 0;
      let out = `const ${input.enumName}={`;
      for (const item of [
        ...input.items,
        ...(input.last ? [input.last] : []),
      ]) {
        let nextValue: string | number;
        if (item.assign) {
          const num = Number(item.assign);
          if (isNaN(num)) {
            nextValue = item.assign as string;
          } else {
            // reset base value
            nextValue = num;
            baseValue = num + 1;
          }
        } else {
          nextValue = baseValue;
          baseValue++;
        }
        // const assign = item.assign || baseValue++;
        // console.log("input!", input);
        // const val = baseValue++;

        const nextValueKey =
          typeof nextValue === "number" ? `"${nextValue}"` : nextValue;
        out += `${item.ident}:${nextValue},${nextValueKey}:"${item.ident}",`;
      }
      return out + "};";
    }
  )
);

const JSX_CREATOR = "React.createElement";
const JSX_FRAGMENT = "React.Fragment";

const jsxElement = $seq(
  ["{", _s, ["expr", anyExpression], _s, "}"],
  (input) => {
    return input.expr;
  }
);

const jsxText = $seq([_s, $regex("[^<>{]+"), _s], (input) => {
  return `"${input.replace(/[\s\n]+/gmu, " ")}"`;
});

const jsxAttributes = $repeat_seq([
  __,
  ["name", identifier],
  $skip_opt("="),
  ["value", $or([stringLiteral, jsxElement])],
]);

const buildJsxCode = (
  ident: string,
  attributes: Array<{ name: string; value: string }>,
  children: Array<string> = []
) => {
  // TODO: Detect dom name
  let data = ",{}";
  if (attributes.length > 0) {
    data = ",{";
    for (const attr of attributes) {
      data += `${attr.name}:${attr.value},`;
    }
    data += "}";
  }
  let childrenCode = "";
  if (children.length > 0) {
    for (const child of children) {
      childrenCode += `,${child}`;
    }
  }
  const isDomPrimitive = /[a-z-]+/.test(ident);
  let element = isDomPrimitive ? `"${ident}"` : ident;
  if (ident === "") {
    element = JSX_FRAGMENT;
  }
  return `${JSX_CREATOR}(${element}${data}${childrenCode})`;
};

const jsxExpression = $def(() =>
  $or([
    // paired tag
    $seq(
      [
        "<",
        ["ident", $pairOpen($or([accessible, ""]))],
        $skip_opt(typeDeclareParameters),
        ["attributes", jsxAttributes],
        _s,
        ">",
        [
          "children",
          $repeat_seq([_s, $or([jsxExpression, jsxText, jsxElement]), _s]),
        ],
        "</",
        ["close", $pairClose($or([accessible, ""]))],
        ">",
      ],
      (input: {
        ident: string;
        attributes: Array<{ name: string; value: string }>;
        children: Array<string>;
      }) => {
        return buildJsxCode(input.ident, input.attributes, input.children);
      }
    ),

    // self closing
    $seq(
      [
        "<",
        ["ident", $or([accessible])],
        $skip_opt(typeDeclareParameters),
        ["attributes", jsxAttributes],
        _s,
        "/>",
      ],
      (input: {
        ident: string;
        attributes: Array<{ name: string; value: string }>;
      }) => {
        return buildJsxCode(input.ident, input.attributes);
      }
    ),
  ])
);

const expressionStatement = $def(() =>
  // $seq([anyExpression)
  $seq([anyExpression, $repeat_seq([",", _s, anyExpression])])
);

const semicolonlessStatement = $def(() =>
  $seq([
    $or([
      // export function/class
      $seq([K_EXPORT, __, $or([functionExpression, classExpression])]),

      classExpression,
      enumStatement,
      functionExpression,
      exportStatement,
      tryCatchStatement,
      ifStatement,
      whileStatement,
      switchStatement,
      doWhileStatement,
      interfaceStatement,
      forStatement,
      forItemStatement,
      blockStatement,
    ]),
    $seq([_s, $opt(";")]),
  ])
);

const semicolonRequiredStatement = $def(() =>
  $seq([
    $not([
      $regex(
        `(${K_CLASS}|${K_EXPORT}|${K_IF}|${K_WHILE}|${K_DO}|${K_SWITCH}|${K_FOR}|${K_INTERFACE}|${K_TRY})[ {\\(]`
      ),
    ]),
    anyStatement,
    // $or([
    //   debuggerStatement,
    //   breakStatement,
    //   returnStatement,
    //   declareVariableStatement,
    //   variableStatement,
    //   typeStatement,
    //   importStatement,
    //   exportStatement,
    //   labeledStatement,
    //   expressionStatement,
    // ]),
  ])
);

const anyStatement = $def(() =>
  $or([
    // "debbuger"
    debuggerStatement,
    // break ...
    breakStatement,
    // return ...
    returnStatement,
    // throw ...
    throwStatement,
    // try
    tryCatchStatement,
    // declare ...
    declareVariableStatement,
    // const ...
    variableStatement,
    // type ...
    typeStatement,
    // interface ...
    interfaceStatement,
    // if ...
    ifStatement,
    // enum
    enumStatement,
    // import ...
    importStatement,
    // export ...
    exportStatement,
    // for ...
    forItemStatement,
    forStatement,
    // do ...
    doWhileStatement,
    // while ...
    whileStatement,
    // switch ...
    switchStatement,
    // foo: ...
    labeledStatement,
    // { ...
    blockStatement,
    // other expression
    expressionStatement,
  ])
);

const line = $def(() =>
  $or([
    $seq([
      // class{}(;\n)
      semicolonlessStatement,
      $or([$skip($token("\n")), $skip($token(";")), $skip(_s)]),
    ]),
    $seq([
      // $opt(anyStatement),
      $opt(semicolonRequiredStatement),
      $r`[ ]*`,
      // $r`[\\n;]`,
      $or([$skip($token("\n")), $token(";")]),
      _s,
    ]),
  ])
);

const caseClause = $def(() =>
  $seq([
    $repeat_seq([$not([K_CASE + " "]), line]),
    $opt($seq([$not([K_CASE + " "]), anyStatement])),
    $skip_opt(";"),
  ])
);

const lines = $def(() =>
  $seq([$repeat_seq([line]), $opt(anyStatement), $skip_opt(";")])
);

const block = $def(() => $seq([K_BLACE_OPEN, _s, lines, _s, K_BLACE_CLOSE]));

export const program = $def(() => $seq([_s, lines, _s, $eof()]));

import { test, run, is } from "@mizchi/test";
import { preprocessLight } from "./preprocess";

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
        // reportError(input, result.error);
        // result.reportErrorDetail();
        throw new Error("Unexpected Result: " + input.replace(/\n/g, "\\n"));
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

  test("identifier", () => {
    const parse = compile(identifier, { end: true });
    expectSame(parse, [
      "a",
      "aa",
      "_",
      "_a",
      "$",
      "$_",
      "_1",
      "aAa",
      "doc",
      "importS",
    ]);
    expectError(parse, [
      "1",
      "1_",
      "const",
      "public",
      "do",
      " do",
      "",
      "import",
    ]);
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
    is(parseExpression(`{\n }`), { result: "{}" });
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
      "importS",
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

      "({})=>1",
      "async ()=>{}",
      "async ()=>await p",
      "async ()=>await new Promise(r=>setTimeout(r))",

      "a=>1",
      `()=>g`,
      `()=> g`,
      `()=>\ng`,
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
      "class{readonly onDidChange = Event.None;}",
      // "class extends A{}",
      "class{x;}",
      "class{readonly x;}",
      "class{readonly x: number;}",

      "class{readonly x = 1;}",

      "class{x=1;}",
      // "class{x=1;#y=2;}",
      `class{readonly x: number = 1;}`,
      "class{static readonly x = 1;}",
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
    is(parse("func()"), { result: "func()" });
    is(parse("func([])"), { result: "func([])" });
    is(parse("func(1,2)"), { result: "func(1,2)" });
    is(parse("func(1,2,)"), { result: "func(1,2,)" });
    is(parse("f<T>()"), { result: "f()" });
    is(parse("f?.()"), { result: "f?.()" });
    is(parse("x.f()"), { result: "x.f()" });
    is(parse("x.f<T>()"), { result: "x.f()" });
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
      "importS",
    ]);
    is(parse("a!"), { result: "a" });
    is(parse("(a.b)!"), { result: "(a.b)" });
  });

  test("identifier", () => {
    const parse = compile(identifier, { end: true });
    expectSame(parse, ["a", "$1", "abc", "a_e", "importS"]);
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
        "|a",
        "|a|a",
        "x is number",
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
        `{
          readonly b: number,
          a: number
        }`,
        // `{ readonly b, number, a: number }`,
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
        "(a?: number) => void",
        "(a: A) => void",
        "(a: A, b: B) => void",
        "(...args: any[]) => void",
        "(...args: any[]) => A | B",
        "((...args: any[]) => A | B) | () => void",
        "infer U",
        "{ readonly x: number; }",
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
    is(parse("debugger"), { result: "debugger" });
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
    const parse = compile($seq([block, $eof()]));
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
    const parse = compile($seq([whileStatement, $eof()]));
    expectSame(parse, ["while(1)1", "while(1){break;}"]);
    expectError(parse, ["while(1)"]);
  });

  test("if", () => {
    const parse = compile($seq([ifStatement, $eof()]));
    expectSame(parse, [
      "if(1)1",
      `if(1){return 1;}`,
      `if(1){}else 2`,
      `if(1){}else{}`,
      `if(1){} else if(1) {}`,
      `if(1){} else if(1) {} else 1`,
      `if(1){if(2)return;}`,
    ]);
  });

  test("switch", () => {
    const parse = compile($seq([switchStatement, $eof()]));
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
      "import'foo'",
      "import * as b from 'xx'",
      "import*as b from'xx'",
      "import a from 'b'",
      'import {} from "b"',
      'import{}from"b"',
      'import {a} from "x"',
      'import {a, b} from "x"',
      'import {a as b} from "x"',
      'import {a as b, d as c,} from "x"',
    ]);
    // drop import type
    is(parse("import type a from 'xxx'"), { result: "" });
    is(parse("import type *as b from 'xxx'"), { result: "" });
    is(parse("import type{a as b} from 'xxx'"), { result: "" });
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
    const parse = compile(expressionStatement, { end: true });
    expectSame(parse, [
      "1",
      "func()",
      "a = 1",
      "a.b = 1",
      "1, 1",
      "a=1",
      "impor",
      "importS",
      "thisX",
    ]);
    expectSame(parse, ["1", "func()"]);
  });

  test("anyStatement", () => {
    const parse = compile(anyStatement);
    expectSame(parse, ["debugger", "{ a=1; }", "foo: {}", "foo: 1"]);
  });

  test("program:with type", () => {
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
      "import{} from 'b';",
      // "export {};",
    ]);
    is(parse("declare const x: number;"), { result: ";" });
    is(parse("declare const x: number = 1;"), { result: ";" });
    is(parse("type x = number;"), { result: ";" });
    is(parse("type x = {};"), { result: ";" });
    is(parse("export type x = number;"), { result: "" });
    is(parse("interface I {}"), { result: "" });
    is(parse("interface I extends T {};"), { result: ";" });
    is(parse("interface I extends T { a: number; };"), { result: ";" });
    is(parse("export interface I {};"), { result: ";" });
  });
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
      `type X = { xxx?: number }`,

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
        public async foobar(x, {}: {} = {}){}
      }`,
      `({...a, ...b})`,
      // `f({\n })`,
      `function f(a={\n }){}`,
      `class{f(a={\n}){}}`,
      `class{f(a={\n}){\n}}`,

      `class{f(a={\n\n}){}}`,
      `class{f(a={a:1}){}}`,
      `class{f(a={a:1,b:\n1}){}}`,
      `class{f(a={a:1\n,b:\n1}){}}`,
      `class{f(a={a:1\n,b:\n1,\n}){}}`,
      `class{f(a={\na:1\n,b:\n1,\n}){}}`,
      `class{f(a={\n a:1\n,b:\n1,\n}){}}`,
      `class{f(a={\n a:1\n,b:\n1,\n}){}}`,
      `class{f(a={\n a,}){}}`,
      `class{f(a={\n a}){}}`,
      `class{f(a={\n a: 1}){}}`,
      `class{f(a={\n a(){}}){}}`,
      `class{f(a={\n}){}}`,

      `class{f(x,){}}`,
      `class{f(x,\n){}}`,
      `class{f(x, ){}}`,
      `class{f(x, \n){}}`,
      `function foo(x,\n ){}`,
      `class{f(x, \n){}}`,
      `class{f(x,\n ){}}`,
      `f(()=>g);`,
      `f(a=>g);`,
      `f(()=>\ng);`,
      `if (process.env.NODE_ENV === "test") {
// xxx
}
`,
      `importS`,
      `[...XS,...YS,]`,
      `(x: number, y?: number) => {}`,
      `class{f(x?:T){}}`,
      `try{}catch(e){}`,
      `try{}catch{}`,
      `try{}catch(e){}finally{}`,
      `try{}finally{}`,
      `switch(1){case a:1;1;case b:2;2;default: 1}`,
      `switch(1){case a:{};case 1:break;default: 1;break;}`,
      `switch (1 as number) {
  case 1:
    try {} catch (error) {}
  case 2:
}`,
    ]);
    is(parse(`enum X { a = "foo", b = "bar" }`), {
      result: `const X={a:"foo","foo":"a",b:"bar","bar":"b",};`,
    });

    expectError(parse, [`class{f(a={a = 1}){}}`]);
  });

  test("transform: class constructor", () => {
    const parse = compile(program, { end: true });
    is(parse("class{ constructor(private x:number) {} }"), {
      result: "class{constructor(x){this.x=x;}}",
    });
    is(parse("class{ constructor(private x:number) {foo;} }"), {
      result: "class{constructor(x){this.x=x;foo;}}",
    });

    is(parse("class{constructor(private x:number,y:number){foo;}}"), {
      result: "class{constructor(x,y){this.x=x;foo;}}",
    });
    is(parse("class{constructor(private x:number,public y:number){foo;}}"), {
      result: "class{constructor(x,y){this.x=x;this.y=y;foo;}}",
    });
    is(parse("class{constructor(x,y:number){foo;}}"), {
      result: "class{constructor(x,y){foo;}}",
    });
    is(parse("class{constructor(x,y:number,private z){foo;}}"), {
      result: "class{constructor(x,y,z){this.z=z;foo;}}",
    });
    is(parse("class{constructor(x,y,z,){}}"), {
      result: "class{constructor(x,y,z){}}",
    });
    is(parse("class{constructor(x,y,private z,){}}"), {
      result: "class{constructor(x,y,z){this.z=z;}}",
    });
    is(parse("class{constructor(private x,){}}"), {
      result: "class{constructor(x){this.x=x;}}",
    });
    is(parse("class{constructor(x,y,private z,){}}"), {
      result: "class{constructor(x,y,z){this.z=z;}}",
    });
    is(parse("class{ constructor(private x:number, y: number) {} }"), {
      result: "class{constructor(x,y){this.x=x;}}",
    });
    is(parse("class{ constructor(private x:number,y:number) {} }"), {
      result: "class{constructor(x,y){this.x=x;}}",
    });
  });

  test("transform: enum", () => {
    const parse = compile(enumStatement, { end: true });
    is(parse("enum X {}"), {
      error: false,
      result: "const X={};",
    });
    is(parse("enum X { a }"), {
      error: false,
      result: `const X={a:0,"0":"a",};`,
    });
    is(parse("enum X { a,b }"), {
      error: false,
      result: `const X={a:0,"0":"a",b:1,"1":"b",};`,
    });
    is(parse("enum X { a,b, }"), {
      error: false,
      result: `const X={a:0,"0":"a",b:1,"1":"b",};`,
    });

    is(parse("enum X { a = 42, }"), {
      error: false,
      result: `const X={a:42,"42":"a",};`,
    });
    is(parse("enum X { a = 42, b }"), {
      error: false,
      result: `const X={a:42,"42":"a",b:43,"43":"b",};`,
    });
    is(parse("enum X { a, b = 42 }"), {
      error: false,
      result: `const X={a:0,"0":"a",b:42,"42":"b",};`,
    });
    is(parse(`enum X { a = "foo" }`), {
      error: false,
      result: `const X={a:"foo","foo":"a",};`,
    });
    is(parse(`enum X { a = "foo", b = "bar" }`), {
      error: false,
      result: `const X={a:"foo","foo":"a",b:"bar","bar":"b",};`,
    });
  });

  test("transform: jsx", () => {
    const parse = compile(jsxExpression, { end: true });
    is(parse("<div />"), {
      error: false,
      result: `React.createElement("div",{})`,
    });
    is(parse(`<div x="a" y="b" />`), {
      error: false,
      result: `React.createElement("div",{x:"a",y:"b",})`,
    });
    is(parse(`<div x={1} />`), {
      error: false,
      result: `React.createElement("div",{x:1,})`,
    });
    is(parse(`<div x={foo+1} />`), {
      error: false,
      result: `React.createElement("div",{x:foo+1,})`,
    });
    // paired
    is(parse("<div><hr /><hr /></div>"), {
      error: false,
      result: `React.createElement("div",{},React.createElement("hr",{}),React.createElement("hr",{}))`,
    });
    is(parse("<div>aaa</div>"), {
      error: false,
      result: `React.createElement("div",{},"aaa")`,
    });
    is(parse("<div>aaa\n   bbb</div>"), {
      error: false,
      result: `React.createElement("div",{},"aaa bbb")`,
    });
    is(parse("<div>{1}</div>"), {
      error: false,
      result: `React.createElement("div",{},1)`,
    });
    is(parse("<div>a{1}b<hr /></div>"), {
      error: false,
      result: `React.createElement("div",{},"a",1,"b",React.createElement("hr",{}))`,
    });
    is(parse("<></>"), {
      error: false,
      result: `React.createElement(React.Fragment,{})`,
    });
    is(parse("<></>"), {
      error: false,
      result: `React.createElement(React.Fragment,{})`,
    });
  });

  run({ stopOnFail: true, stub: true, isMain });
}
