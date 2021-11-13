import {
  ERROR_Regex_Unmatch,
  ERROR_Seq_Stop,
  ParseError,
} from "./../../pargen-tokenized/src/types";
import {
  $any,
  $atom,
  $def,
  $eof,
  $not,
  $opt,
  $opt_seq,
  $or,
  // $pairClose,
  // $pairOpen,
  $r,
  $regex,
  $repeat,
  $repeat_seq,
  // $repeat_seq1,
  $seq,
  $seqo,
  $skip,
  $skip_opt,
  $token,
} from "../../pargen-tokenized/src/builder";

import {
  K_ABSTRACT,
  K_AS,
  K_ASYNC,
  K_AWAIT,
  K_BLACE_CLOSE as K_BRACE_CLOSE,
  K_BLACE_OPEN as K_BRACE_OPEN,
  K_BREAK,
  K_CASE,
  K_CATCH,
  K_CLASS,
  K_CONST,
  K_CONSTRUCTOR,
  K_CONTINUE,
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
  K_SUPER,
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
  K_WITH,
  K_YIELD,
  OPERATORS,
  RESERVED_WORDS,
  // REST_SPREAD,
  SPACE_REQUIRED_OPERATORS,
} from "./constants";
import { formatError } from "../../pargen-tokenized/src/format";

import { config } from "./ctx";

const whitespace = $def(() => $any(0, () => " "));
const plusPlus = $seq(["+", "+"]);
const minusMinus = $seq(["-", "-"]);
// const _ = $regex(_w);
// const _s = $skip($regex(_w));
// const __ = $regex(__w);
// const controlls = CONTROL_TOKENS.map((r) => "\\" + r).join("");
const identifier = $def(() =>
  // TODO: optimize
  $seq([
    $not([...RESERVED_WORDS, ...CONTROL_TOKENS]),
    $regex(/^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/m),
  ])
);

const thisKeyword = $token(K_THIS);
const importKeyword = $token(K_IMPORT);
const dotDotDot = $def(() => $seq([".", ".", "."]));

const typeDeclareParameter = $def(() =>
  $seq([
    typeExpression,
    // extends T
    $opt($seq([whitespace, K_EXTENDS, whitespace, typeExpression])),
    $opt($seq(["=", $not([">"]), typeExpression])),
  ])
);

// declare parameters
const typeDeclareParameters = $def(() =>
  $seq([
    "<",
    $repeat_seq([typeDeclareParameter, ","]),
    $seq([typeDeclareParameter, $opt(",")]),
    ">",
  ])
);

// apply parameters
const typeParameters = $def(() =>
  $seq([
    "<",
    $repeat_seq([typeExpression, ","]),
    $seq([typeExpression, $opt(",")]),
    ">",
  ])
);

const typeParen = $def(() =>
  $seq([K_PAREN_OPEN, typeExpression, K_PAREN_CLOSE, $opt(typeParameters)])
);

const typeIdentifier = $def(() =>
  $seq([
    $not([$seq([K_READONLY, whitespace])]),
    $or([K_VOID, $seq([identifier, $opt(typeParameters)])]),
  ])
);

const typePrimary = $def(() =>
  $or([typeParen, typeObjectLiteral, typeArrayLiteral, typeIdentifier])
);

const typeReference = $def(() =>
  $seq([
    typePrimary,
    $repeat_seq([
      $or([
        $seq([".", typeIdentifier]),
        $seq(["[", $opt(typeExpression), "]"]),
      ]),
    ]),
  ])
);

const typeNameableItem = $def(() =>
  $or([
    $seq([
      // start: number,
      identifier,
      $opt(K_QUESTION),
      ":",
      typeExpression,
    ]),
    typeExpression,
  ])
);

const typeArrayLiteral = $def(() =>
  $seq([
    // array
    "[",
    // repeat
    $repeat_seq([typeNameableItem, ","]),
    $opt(
      $or([
        $seq([
          // ...args: any
          dotDotDot,
          identifier,
          ":",
          typeExpression,
        ]),
        typeNameableItem,
      ])
    ),
    "]",
  ])
);

const typeFunctionArgs = $def(() =>
  $seq([
    $repeat_seq([
      // args
      identifier,
      $opt(K_QUESTION),
      ":",
      typeExpression,
      ",",
    ]),
    $opt(
      $or([
        // last
        $seq([dotDotDot, identifier, ":", typeExpression]),
        $seq([identifier, $opt(K_QUESTION), ":", typeExpression, $opt(",")]),
      ])
    ),
  ])
);

const typeObjectItem = $def(() =>
  $or([
    $seq([
      // async foo<T>(arg: any): void;
      $opt($seq([K_ASYNC, whitespace])),
      identifier,

      $opt(typeDeclareParameters),

      K_PAREN_OPEN,

      typeFunctionArgs,

      K_PAREN_CLOSE,

      $opt(K_QUESTION),
      ":",

      typeExpression,
    ]),
    // member
    $seq([
      $opt($seq([K_READONLY, whitespace])),
      identifier,
      $opt(K_QUESTION),
      ":",
      typeExpression,
    ]),
  ])
);

const typeObjectLiteral = $def(() =>
  $seq([
    // object
    K_BRACE_OPEN,
    $repeat_seq([typeObjectItem, $or([",", ";"])]),
    $opt(typeObjectItem),
    $opt($or([",", ";"])),
    K_BRACE_CLOSE,
  ])
);

const typeLiteral = $def(() =>
  $or([
    typeObjectLiteral,
    typeArrayLiteral,
    stringLiteral,
    numberLiteral,
    templateLiteral,
    booleanLiteral,
    nullLiteral,
  ])
);

const typeFunctionExpression = $def(() =>
  $seq([
    $opt(typeDeclareParameters),
    K_PAREN_OPEN,
    typeFunctionArgs,
    K_PAREN_CLOSE,
    "=",
    ">",
    typeExpression,
  ])
);

const typeUnaryExpression = $def(() =>
  $seq([
    $opt($seq([$or(["keyof", K_TYPEOF, "infer"]), whitespace])),
    $or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
  ])
);

const typeBinaryExpression = $def(() =>
  $seq([
    $opt($or(["|", "&"])),
    $repeat_seq([
      typeUnaryExpression,
      $or([$seq(["|"]), $seq(["&"]), $seq([whitespace, "is", whitespace])]),
    ]),
    typeUnaryExpression,
  ])
);

const typeExpression = $def(() => typeBinaryExpression);

/*
  destructive patterns
*/

// Destructive Pattren
const destructiveArrayPattern = $def(() =>
  $seq([
    "[",
    $repeat_seq([
      // item, {},,
      $opt($seq([destructive, $opt($seq([assign]))])),
      ",",
    ]),
    // last item
    $or([
      // [,...i]
      $seq([dotDotDot, identifier]),
      // [,a = 1 ,]
      $seq([destructive, $opt(assign), $opt(",")]),
      $seq([$opt(",")]),
    ]),
    "]",
  ])
);

const destructiveObjectItem = $def(() =>
  $seq([identifier, $opt($seq([":", destructive])), $opt(assign)])
);

const destructiveObjectPattern = $def(() =>
  $seq([
    K_BRACE_OPEN,
    $repeat_seq([destructiveObjectItem, ","]),
    $opt($or([$seq([dotDotDot, identifier]), destructiveObjectItem])),
    K_BRACE_CLOSE,
  ])
);

const destructive = $def(() =>
  $seq([
    $or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    $opt(assign),
  ])
);

const funcArgWithAssign = $def(() =>
  $seq([
    $or([
      // pattern(:T)?
      destructiveObjectPattern,
      destructiveArrayPattern,
      identifier,
    ]),
    $skip_opt($seq([$skip_opt(K_QUESTION), ":", typeExpression])),
    $opt_seq([$skip_opt(K_QUESTION), "=", $not([">"]), anyExpression]),
  ])
);

const funcArgs = $def(() =>
  $seq([
    $repeat_seq([funcArgWithAssign, ","]),
    $opt($or([$seq([dotDotDot, funcArgWithAssign]), funcArgWithAssign])),
    $skip_opt(","),
  ])
);

const callArguments = $def(() =>
  $seq([
    $repeat_seq([anyExpression, ","]),
    $or([
      // rest spread
      $seq([dotDotDot, anyExpression]),
      anyExpression,
      $any(0),
    ]),
  ])
);

/* Expression */

const stringLiteral = $def(() =>
  $or([
    $seq(["'", $opt($regex(/^[^']+$/u)), "'"]),
    $seq(['"', $opt($regex(/^[^"]+$/u)), '"']),
  ])
);

const regexpLiteral = $def(() =>
  $seq(["/", $regex(/^[^\/]+$/u), "/", $opt($regex(/^[gimsuy]+$/))])
);

const templateExpressionStart = $token("${");
const templateLiteralString = $def(() => $regex(/^[^`]+$/mu));
const templateLiteral = $def(() =>
  $seq([
    "`",
    $repeat_seq([
      $opt($seq([$not([templateExpressionStart]), templateLiteralString])),
      templateExpressionStart,
      anyExpression,
      K_BRACE_CLOSE,
    ]),
    $opt(templateLiteralString),
    "`",
  ])
);

// TODO: 111_000
// TODO: 0b1011

// const digit = $regex(/^[1-9][0-9_]*$/);
const digit = $regex(/^[1-9](_?\d)*$/);
const digitWithSuffix = $regex(/^[1-9](_?\d)*(e[1-9]\d*)?$/);
const numberLiteral = $def(() =>
  $or([
    $regex(/^0[bB][0-1]+$/),
    $regex(/^0[oO][0-8]+$/),
    $regex(/^0[xX][0-9a-f]+$/),
    $seq([$or([digit, "0"]), ".", digitWithSuffix]),
    digitWithSuffix,
    "0",
  ])
);

const booleanLiteral = $def(() => $or([K_TRUE, K_FALSE]));
const nullLiteral = $def(() => K_NULL);

const arrayItem = $def(() =>
  $seq([$opt($seq([".", ".", "."])), anyExpression])
);
const arrayLiteral = $def(() =>
  $seq([
    // [a,...b,]
    "[",
    $repeat_seq([$opt(arrayItem), ","]),
    $opt(arrayItem),
    "]",
  ])
);

// key: val
const objectItem = $def(() =>
  $or([
    $seq([".", ".", ".", anyExpression]),
    // $seq([
    //   // function
    //   $opt($or([K_ASYNC, K_GET, K_SET])),
    //   $or([stringLiteral, $seq(["[", anyExpression, "]"]), identifier]),
    //   $seq([K_PAREN_OPEN, functionArguments, K_PAREN_CLOSE, block]),
    // ]),
    $seq([
      // value
      $or([
        // 'key':
        stringLiteral,
        // [key]:
        $seq(["[", anyExpression, "]"]),
        // a
        identifier,
      ]),
      ":",
      anyExpression,
    ]),
    // shothand
    identifier,
  ])
);

// ref by key
const objectLiteral = $def(() =>
  $seq([
    K_BRACE_OPEN,
    $repeat($seq([objectItem, ","])),
    $opt($seq([objectItem, $opt(",")])),
    K_BRACE_CLOSE,
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
// const accessModifier = $regex(`(${K_PRIVATE}|${K_PUBLIC}|${K_PROTECTED}) `);
const accessModifier = $or([K_PRIVATE, K_PUBLIC, K_PROTECTED]);
// const accessModifier = $or([K_PRIVATE,K_PUBLIC,K_PROTECTED]);
// const staticModifier = $token(`static `);
// const readonlyModifier = $token(`readonly `);
// const staticModifier = $seq([K_STATIC]);
// const asyncModifier = $seq([K_ASYNC]);
const getOrSetModifier = $seq([$or([K_GET, K_SET])]);

type ParsedCostructorArg = {
  init: string | null;
  code: string;
};

const classConstructorArg = $def(() =>
  $seqo(
    [
      [
        { key: "ident" },
        $or([
          // private
          $seqo([
            ["access", accessModifier],
            ["ident", identifier],
          ]),
          destructiveObjectPattern,
          destructiveArrayPattern,
          identifier,
        ]),
      ],
      [
        { key: "init", opt: true },
        $seq([
          $skip_opt($seq([K_QUESTION, ":", typeExpression])),
          "=",
          $not([">"]),
          anyExpression,
        ]),
      ],
    ],
    (input: {
      ident: (string | { access: string; ident: string })[] | [{}];
      init: string[];
    }): ParsedCostructorArg => {
      // console.log("constructor-arg", input);
      if (typeof input.ident[0] === "object") {
        // console.log("is private", input.init?.join(""));
        // @ts-ignore
        const ident = input.ident[0].ident.join("");
        return {
          init: ident,
          code: ident + (input.init?.join("") ?? ""),
        };
      }
      return {
        init: null,
        code: input.ident.join("") + (input.init?.join("") ?? ""),
      };
    }
  )
);

const classConstructor = $def(() =>
  $seqo<any, any>(
    [
      $skip_opt(accessModifier),
      K_CONSTRUCTOR,
      K_PAREN_OPEN,
      ["args", $repeat($seq([classConstructorArg, $skip(",")]))],
      [{ key: "last", opt: true }, $seq([classConstructorArg, $skip_opt(",")])],
      K_PAREN_CLOSE,
      K_BRACE_OPEN,
      ["body", lines],
      K_BRACE_CLOSE,
    ],
    (input: {
      args: Array<ParsedCostructorArg>;
      last: Array<ParsedCostructorArg>;
      body: number[];
    }) => {
      const argList = [...(input.args ?? []), ...(input.last ?? [])];
      let bodyIntro = "";
      let args: string[] = [];
      for (const arg of argList) {
        console.log("arg", JSON.stringify(arg));
        if (arg.init) bodyIntro += `this.${arg.init}=${arg.init};`;
        args.push(arg.code);
      }
      const bodyCode = input.body.join("");
      return `${K_CONSTRUCTOR}(${args.join(",")}){${bodyIntro}${bodyCode}}`;
    }
  )
);

const classField = $def(() =>
  $or([
    classConstructor,
    $seq([
      $skip_opt($seq([accessModifier, whitespace])),
      $opt_seq([K_STATIC, whitespace]),
      $opt_seq([K_ASYNC, whitespace]),
      $opt_seq([getOrSetModifier, whitespace]),
      $opt("*"),
      $opt("#"),
      identifier,
      $skip_opt($seq([typeDeclareParameters])),
      K_PAREN_OPEN,
      funcArgs,
      K_PAREN_CLOSE,
      $skip_opt($seq([typeAnnotation])),
      block,
    ]),
    // field
    $seq([
      $skip_opt(accessModifier),
      $opt_seq([K_STATIC, whitespace]),
      $skip_opt($seq([K_READONLY, whitespace])),
      $opt_seq(["#"]),
      identifier,
      $skip_opt($seq([typeAnnotation])),
      $opt_seq(["=", $not([">"]), anyExpression]),
      ";",
    ]),
  ])
);

const classExpr = $def(() =>
  $seq([
    $skip_opt($seq([K_ABSTRACT])),
    K_CLASS,
    $opt($seq([whitespace, identifier])),
    $skip_opt(typeDeclareParameters),
    $opt($seq([whitespace, K_EXTENDS, whitespace, anyExpression])),
    $skip_opt($seq([K_IMPLEMENTS, typeExpression])),
    K_BRACE_OPEN,
    $repeat_seq([classField]),
    K_BRACE_CLOSE,
  ])
);

const func = $def(() =>
  $seq([
    $opt($seq([K_ASYNC, whitespace])),
    K_FUNCTION,
    $opt($seq(["*"])),
    $opt($seq([whitespace, identifier])),
    $skip_opt(typeDeclareParameters),
    K_PAREN_OPEN,
    funcArgs,
    K_PAREN_CLOSE,
    $skip_opt(typeAnnotation),
    $or([block, anyStatement]),
  ])
);

const arrowFunc = $def(() =>
  $seq([
    $opt($seq([K_ASYNC, whitespace])),
    $skip_opt(typeDeclareParameters),
    $opt("*"),
    $or([
      $seq([K_PAREN_OPEN, funcArgs, K_PAREN_CLOSE, $skip_opt(typeAnnotation)]),
      identifier,
    ]),
    "=",
    ">",
    $or([block, anyStatement]),
  ])
);

const newExpr = $def(() => $seq([K_NEW, whitespace, accessible]));

const paren = $def(() =>
  $seq([K_PAREN_OPEN, anyExpression, K_PAREN_CLOSE, $not([$seq(["=", ">"])])])
);

const primary = $def(() =>
  $or([
    jsxExpr,
    paren,
    newExpr,
    objectLiteral,
    arrayLiteral,
    stringLiteral,
    regexpLiteral,
    templateLiteral,
    identifier,
    K_SUPER,
    // should be after identifier
    thisKeyword,
    importKeyword,
  ])
);

const access = $def(() =>
  $or([
    $seq(["[", anyExpression, "]"]),
    $seq([
      $opt_seq(["?", "."]),
      $skip_opt(typeParameters),
      K_PAREN_OPEN,
      callArguments,
      K_PAREN_CLOSE,
    ]),
    $seq([
      $opt($or(["!", "?"])),
      ".",
      $opt("#"),
      $or([identifier, K_DELETE, K_WITH]),
    ]),
    $seq([$opt($seq(["?", "."])), "[", anyExpression, "]"]),
  ])
);

const accessible = $def(() =>
  $or([$seq([primary, $repeat(access)]), anyLiteral])
);

const unary = $def(() =>
  $or([
    // with unary prefix
    $seq([
      $or([
        $seq([$or([K_VOID, K_AWAIT, K_TYPEOF, K_DELETE]), whitespace]),
        plusPlus,
        minusMinus,
        "~",
        "!",
      ]),
      unary,
    ]),
    // tagged template
    $seq([$or([accessible, paren]), templateLiteral]),
    $seq([
      $or([classExpr, func, arrowFunc, accessible, paren]),
      $opt($or([plusPlus, minusMinus])),
      // ts bang operator
      $skip_opt("!"),
    ]),
  ])
);

const binaryOperator = $or([
  // 3 chars
  // ">"
  $seq([">", ">", ">"]),
  $seq(["=", "=", "="]),
  $seq(["!", "=", "="]),
  // 2 chars
  $seq(["=", "="]),
  $seq(["|", "|"]),
  $seq(["|", "|"]),
  $seq(["&", "&"]),
  $seq(["*", "*"]),
  $seq([">", "="]),
  $seq(["<", "="]),
  $seq(["=", "="]),
  $seq(["!", "="]),
  $seq(["<", "<"]),
  $seq([">", ">"]),
  $seq(["+", "="]),
  $seq(["-", "="]),
  $seq(["*", "="]),
  $seq(["|", "="]),
  $seq(["/", "="]),
  $seq(["?", "?"]),
  "-",
  "|",
  "&",
  "*",
  "/",
  ">",
  "<",
  "^",
  "%",
  $seq(["+", $not(["+"])]),
  $seq(["-", $not(["-"])]),
  $seq(["=", $not([">"])]),
]);

const binaryAsExpr = $def(() =>
  $seq([
    binary,
    $skip_opt($seq([whitespace, K_AS, whitespace, typeExpression])),
  ])
);

const binary = $def(() =>
  $seq([
    unary,
    $repeat_seq([
      $or([
        binaryOperator,
        $seq([whitespace, $or(["in", "instanceof"]), whitespace]),
      ]),
      anyExpression,
    ]),
  ])
);

// a ? b: c
const ternary = $def(() =>
  $or([
    $seq([binaryAsExpr, K_QUESTION, anyExpression, ":", anyExpression]),
    binaryAsExpr,
  ])
);

const anyExpression = ternary;

const typeAnnotation = $seq([":", typeExpression]);
// const emptyStatement = $def(() => $seq([$r`(\\s)*`]));
const breakStmt = $def(() => K_BREAK);
const continueStmt = $def(() => K_CONTINUE);
const debuggerStmt = $def(() => K_DEBUGGER);

// it includes yield and throw
const returnLikeStmt = $def(() =>
  $seq([$or([K_RETURN, K_YIELD]), $opt_seq([whitespace, anyExpression])])
);
const throwStmt = $def(() =>
  $seq([K_THROW, whitespace, $or([newExpr, anyExpression])])
);

const blockOrStmt = $def(() => $or([block, anyStatement]));

const blockStmt = $def(() => block);

const labeledStmt = $def(() => $seq([identifier, ":", anyStatement]));

const _importRightSide = $def(() =>
  $seq([
    $or([
      // default only
      $seq([whitespace, identifier, whitespace]),
      $seq(["*", K_AS, whitespace, identifier, whitespace]),
      // TODO: * as b
      $seq([
        K_BRACE_OPEN,
        $repeat_seq([
          identifier,
          $opt($seq([whitespace, K_AS, whitespace, identifier])),
          ",",
        ]),
        // last item
        $opt(
          $seq([
            identifier,
            $opt(
              $seq([whitespace, K_AS, whitespace, identifier, $skip_opt(",")])
            ),
          ])
        ),
        K_BRACE_CLOSE,
      ]),
    ]),
    K_FROM,
    stringLiteral,
  ])
);

const importStmt = $def(() =>
  $or([
    // import 'specifier';
    $seq([K_IMPORT, stringLiteral]),
    // import type
    $seq([$skip($seq([K_IMPORT, K_TYPE, _importRightSide]))]),
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
      K_BRACE_OPEN,
      $repeat_seq([
        defaultOrIdentifer,
        $opt($seq([whitespace, K_AS, whitespace, defaultOrIdentifer])),
        ",",
      ]),
      // last item
      $opt(
        $seq([
          defaultOrIdentifer,
          $opt($seq([whitespace, K_AS, whitespace, defaultOrIdentifer])),
          $opt(","),
        ])
      ),
      K_BRACE_CLOSE,
      $opt($seq([K_FROM, stringLiteral])),
    ]),
    // export named expression
    $seq([K_EXPORT, whitespace, $or([variableStatement, func, classExpr])]),
  ])
);

const ifStatement = $def(() =>
  $seq([
    K_IF,
    K_PAREN_OPEN,
    anyExpression,
    K_PAREN_CLOSE,
    blockOrStmt,
    $opt(
      $seq([
        whitespace,
        K_ELSE,
        whitespace,
        $or([
          // xx
          $seq([block]),
          $seq([anyStatement]),
        ]),
      ])
    ),
  ])
);

const switchStatement = $def(() =>
  $seq([
    K_SWITCH,
    K_PAREN_OPEN,
    anyExpression,
    K_PAREN_CLOSE,
    K_BRACE_OPEN,
    $repeat_seq([
      $repeat_seq([K_CASE, whitespace, anyExpression, ":"], [1, Infinity]),
      $opt(
        $or([
          $seq([
            // xxx
            $or([block, caseClause]),
            $opt(";"),
          ]),
          lines,
        ])
      ),
    ]),
    $opt($seq([K_DEFAULT, ":", $or([block, caseClause])])),
    K_BRACE_CLOSE,
  ])
);

const assign = $def(() => $seq(["=", $not([">"]), anyExpression]));
const variableStatement = $def(() =>
  $seq([
    variableType,
    whitespace,
    $repeat_seq([destructive, $skip_opt(typeAnnotation), $opt(assign), ","]),
    destructive,
    $skip_opt(typeAnnotation),
    $opt(assign),
  ])
);

const declareVariableStatement = $def(() =>
  $seq([$skip($seq([K_DECLARE, variableStatement]))])
);

const typeStatement = $def(() =>
  $seq([
    $skip(
      $seq([
        $opt($seq([K_EXPORT])),
        K_TYPE,
        identifier,
        "=",
        $not([">"]),
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
        $opt($seq([K_EXPORT])),
        K_INTERFACE,
        identifier,
        $opt($seq([K_EXTENDS, whitespace, typeExpression])),
        typeObjectLiteral,
      ])
    ),
  ])
);

const forStatement = $def(() =>
  $seq([
    K_FOR,
    K_PAREN_OPEN,
    $opt($or([variableStatement, anyExpression])),
    ";",
    $opt(anyExpression),
    ";",
    $opt(anyExpression),
    K_PAREN_CLOSE,
    blockOrStmt,
  ])
);

const variableType = $or([K_VAR, K_CONST, K_LET]);

const forItemStatement = $def(() =>
  $seq([
    K_FOR,
    K_PAREN_OPEN,
    $seq([variableType, whitespace]),
    destructive,
    whitespace,
    $or(["of", "in"]),
    whitespace,
    anyExpression,
    K_PAREN_CLOSE,
    blockOrStmt,
  ])
);

const whileStatement = $def(() =>
  $seq([K_WHILE, K_PAREN_OPEN, anyExpression, K_PAREN_CLOSE, blockOrStmt])
);

const doWhileStatement = $def(() =>
  $or([
    $seq([
      K_DO,
      $or([$seq([block]), $seq([anyStatement])]),
      K_WHILE,
      K_PAREN_OPEN,
      anyExpression,
      K_PAREN_CLOSE,
    ]),
  ])
);

// try{}finally{};
const _finally = $def(() => $seq([K_FINALLY, block]));
const tryCatchStatement = $def(() =>
  $or([
    $seq([
      // try
      K_TRY,

      block,

      $or([
        $seq([
          K_CATCH,
          $opt($seq([K_PAREN_OPEN, anyExpression, K_PAREN_CLOSE])),

          block,
          $opt($seq([_finally])),
        ]),
        _finally,
      ]),
    ]),
  ])
);

const enumAssign = $def(() =>
  $seq([$skip("="), $or([numberLiteral, stringLiteral])])
);

const ENUM_NAME = "1";

const enumStatement = $def(() =>
  $seqo(
    [
      K_ENUM,
      whitespace,
      ["enumName", identifier],
      K_BRACE_OPEN,
      [
        "items",
        $repeat(
          $seqo([
            ["ident", identifier],
            [{ key: "assign", opt: true }, enumAssign],
            $skip(","),
          ])
        ),
      ],
      [
        { key: "last", opt: true },
        $seqo([
          ["ident", identifier],
          [{ key: "assign", opt: true }, enumAssign],
          $skip_opt(","),
        ]),
      ],
      K_BRACE_CLOSE,
    ],
    (input: {
      enumName: string;
      items: Array<{ ident: string[]; assign?: string[] }>;
      last?: Array<{ ident: string[]; assign?: string[] }>;
    }) => {
      let baseValue = 0;
      let out = `const ${input.enumName}={`;
      // console.log("input", input);
      for (const item of [...(input.items ?? []), ...(input.last ?? [])]) {
        let val: string | number;
        if (item.assign) {
          const num = Number(item.assign);
          if (isNaN(num)) {
            val = item.assign.join("") as string;
          } else {
            // reset base value
            val = num;
            baseValue = num + 1;
          }
        } else {
          val = baseValue;
          baseValue++;
        }
        const key = item.ident.join("");
        if (typeof val === "number") {
          out += `${key}:${val},"${val}":"${key}",`;
        } else {
          out += `${key}:${val},`;
        }
      }
      return out + "};";
    }
  )
);

const jsxInlineExpr = $seq([$skip("{"), anyExpression, $skip("}")]);

const jsxText = $def(() =>
  $atom((ctx, pos) => {
    let i = 0;
    const results: string[] = [];
    while (i < ctx.tokens.length) {
      const token = ctx.tokens[pos + i];
      if ([">", "<", "{"].includes(token)) {
        break;
      }
      results.push(token);
      i++;
    }
    if (results.length === 0) {
      return fail(pos, -1, {} as any);
    }
    return success(pos, i, ['"' + results.join(" ") + '"']);
  })
);

// JSX transform constants
const IDENT = "1";
const ATTRIBUTES = "2";
const CHILDREN = "3";
const NAME = "4";
const VALUE = "5";

const jsxAttributes = $repeat(
  $seqo([
    [NAME, identifier],
    [VALUE, $seq([$skip_opt("="), $or([stringLiteral, jsxInlineExpr])])],
  ])
);

const buildJsxCode = (
  ident: string,
  attributes: Array<{ [NAME]: string; [VALUE]: string }>,
  children: Array<string> = []
) => {
  // TODO: Detect dom name
  let data = ",{}";
  if (attributes.length > 0) {
    data = ",{";
    for (const attr of attributes) {
      data += `${attr[NAME]}:${attr[VALUE]},`;
    }
    data += "}";
  }
  let childrenCode = "";
  if (children.length > 0) {
    for (const child of children) {
      childrenCode += `,${child}`;
    }
  }
  const isDomPrimitive = /^[a-z-]+$/.test(ident);
  let element = isDomPrimitive ? `"${ident}"` : ident;
  if (ident === "") {
    element = config.jsxFragment;
  }
  return `${config.jsx}(${element}${data}${childrenCode})`;
};

const $debug_next_token = $atom((ctx, pos) => {
  console.log("[next] >", ctx.tokens[pos]);
  return success(pos, 0, []);
});

const jsxElement = $def(() =>
  $seqo(
    [
      "<",
      // $debugger,
      // [{ key: IDENT, push: true }, $or([accessible, ""])],
      [{ key: IDENT, push: true }, accessible],
      $skip_opt(typeDeclareParameters),
      [ATTRIBUTES, jsxAttributes],
      ">",
      [CHILDREN, $repeat($or([jsxSelfCloseElement, jsxInlineExpr, jsxText]))],
      // [CHILDREN, $repeat_seq([$or([jsxInlineExpr, jsxText])])],
      "<",
      "/",
      [
        {
          key: "close",
          pop: (a, b, ctx) => {
            // TODO: Multi token equality
            return ctx.tokens[a[0]] === ctx.tokens[b[0]];
          },
        },
        $or([accessible, ""]),
      ],
      ">",
    ],
    (input: {
      [IDENT]: string[];
      [ATTRIBUTES]: Array<{ [NAME]: string[]; [VALUE]: string[] }>;
      [CHILDREN]: Array<string[]>;
    }) => {
      console.log("children", input[CHILDREN]);
      return buildJsxCode(
        input[IDENT].join(""),
        input[ATTRIBUTES].map((a) => {
          return {
            [NAME]: a[NAME].join(""),
            [VALUE]: a[VALUE].join(""),
          };
        }),
        input[CHILDREN].flat()
      );
    }
  )
);

const jsxSelfCloseElement = $def(() =>
  $seqo(
    [
      "<",
      $debug_next_token,
      [IDENT, accessible],
      // $skip_opt(typeDeclareParameters),
      [ATTRIBUTES, jsxAttributes],
      "/",
      ">",
    ],
    (input: {
      [IDENT]: string[];
      [ATTRIBUTES]: Array<{ [NAME]: string[]; [VALUE]?: string[] }>;
    }) => {
      return buildJsxCode(
        input[IDENT].join(""),
        input[ATTRIBUTES].map((a) => ({
          [NAME]: a[NAME].join(""),
          [VALUE]: a[VALUE]?.join("") ?? "",
        }))
      );
    }
  )
);

const jsxExpr = $def(() => $or([jsxSelfCloseElement, jsxElement]));

const expressionStatement = $def(() =>
  $seq([anyExpression, $repeat_seq([",", anyExpression])])
);

const semicolonlessStatement = $def(() =>
  $seq([
    $or([
      // export function/class
      $seq([K_EXPORT, whitespace, $or([func, classExpr])]),
      // anyStatement,
      classExpr,
      enumStatement,
      func,
      exportStatement,
      tryCatchStatement,
      ifStatement,
      whileStatement,
      switchStatement,
      doWhileStatement,
      interfaceStatement,
      forStatement,
      forItemStatement,
      blockStmt,
    ]),
    // $seq([$opt(";")]),
  ])
);

const semicolonRequiredStatement = $def(() =>
  $seq([
    $not([
      K_CLASS,
      K_EXPORT,
      K_IF,
      K_WHILE,
      K_DO,
      K_SWITCH,
      K_FOR,
      K_INTERFACE,
      K_TRY,
    ]),
    anyStatement,
    // $or([
    //   debuggerStmt,
    //   breakStmt,
    //   returnLikeStmt,
    //   declareVariableStatement,
    //   variableStatement,
    //   typeStatement,
    //   importStmt,
    //   exportStatement,
    //   labeledStmt,
    //   expressionStatement,
    // ]),
  ])
);

export const anyStatement = $def(() =>
  $or([
    // "debbuger"
    debuggerStmt,
    // break ...
    breakStmt,
    // continue ...
    continueStmt,
    // return ...
    returnLikeStmt,
    // throw ...
    throwStmt,
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
    importStmt,
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
    labeledStmt,
    // { ...
    blockStmt,
    // other expression
    expressionStatement,
  ])
);

export const line = $def(() =>
  $or([
    $seq([semicolonlessStatement, $skip_opt(";")]),
    $seq([$opt(semicolonRequiredStatement), ";"]),
  ])
);

const caseClause = $def(() =>
  $seq([
    $repeat_seq([$not([K_CASE]), line]),
    $opt($seq([$not([K_CASE]), anyStatement])),
    $skip_opt(";"),
  ])
);

const lines = $def(() =>
  $seq([$repeat_seq([line]), $opt(anyStatement), $skip_opt(";")])
);

const block = $def(() => $seq([K_BRACE_OPEN, lines, K_BRACE_CLOSE]));

export const program = $def(() => $seq([lines, $eof()]));

import { test, run, is } from "@mizchi/test";
import { Rule } from "../../pargen-tokenized/src/types";
import { CONTROL_TOKENS, parseTokens } from "./tokenizer";

const isMain = require.main === module;

import { compile as compileRaw } from "./ctx";
import { fail, success } from "../../pargen-tokenized/src/runtime";
// import { formatError } from "../benchmark/cases/example1";
if (process.env.NODE_ENV === "test") {
  const compile = (
    inputRule: Rule | number,
    end: boolean = true
  ): ((input: string) => string | ParseError) => {
    const parser = end
      ? compileRaw($seq([inputRule, $eof()]))
      : compileRaw(inputRule);
    const wrappedParser = (input: string) => {
      let tokens: string[] = [];
      for (const next of parseTokens(input)) {
        if (next === "\n") continue;
        tokens.push(next);
      }
      const out = parser(tokens, 0);
      if (out.error) {
        return out;
      } else {
        return out.results
          .map((r) => (typeof r === "number" ? tokens[r] : r))
          .join("");
      }
    };
    return wrappedParser;
  };
  const expectSuccess = (parse: any, input: string, expect: string = input) => {
    is(parse(input), expect);
  };
  const expectSuccessList = (parse: any, input: string[]) => {
    for (const i of input) {
      expectSuccess(parse, i);
    }
  };

  const expectFail = (parse: any, input: string, expect: string = input) => {
    const parsed = parse(input);
    if (!parsed.error) {
      throw new Error("Unexpected Success:" + JSON.stringify(parsed));
    }
  };

  test("identifier", () => {
    const parse = compile(identifier);
    expectSuccess(parse, "a");
    expectSuccess(parse, "Aaa");
    expectSuccess(parse, "doc");
    expectSuccess(parse, "あああ");
    expectSuccess(parse, "a1");
    expectSuccess(parse, "a1");
    expectSuccess(parse, "foo");
    expectFail(parse, "1");
    expectFail(parse, "&");
    expectFail(parse, "1_");
    expectFail(parse, "this");
    expectFail(parse, "import");
  });

  test("string", () => {
    const parse = compile(stringLiteral);
    expectSuccess(parse, "''");
    expectSuccess(parse, "'hello'");
    expectFail(parse, "");
    is(parse("'hello"), {
      error: true,
      errorType: ERROR_Seq_Stop,
    });
    is(parse("hello'"), {
      error: true,
      errorType: ERROR_Seq_Stop,
    });
  });

  test("this", () => {
    const parse = compile(thisKeyword);
    expectSuccess(parse, "this");
    expectFail(parse, "thisx");
  });

  test("template", () => {
    const parse = compile(templateLiteral);
    expectSuccess(parse, "``");
    expectSuccess(parse, "`x`");
    expectSuccess(parse, "`x\nx`");
    expectSuccess(parse, "`${a}`");
    expectSuccess(parse, "`a${a}`");
    expectSuccess(parse, "`${a}_${b}_c`");
  });
  test("RegExp", () => {
    const parse = compile(regexpLiteral);
    expectSuccessList(parse, [
      "/hello/",
      "/hello/i",
      "/hello/gui",
      "/xy  z/",
      "/.{1,}/g",
      // "/a\\/b/",
    ]);
    expectFail(parse, "//");
  });

  test("number", () => {
    const parse = compile(numberLiteral);
    expectSuccess(parse, "0");
    expectSuccess(parse, "0.1");
    expectSuccess(parse, "1");
    expectSuccess(parse, "11");
    expectSuccess(parse, "111.222");
    expectFail(parse, "01");
    expectSuccess(parse, "1_1");
    expectFail(parse, "1_");
    expectSuccess(parse, "1_1");
    expectSuccess(parse, "1_11_1");
    expectFail(parse, "1__1");
    expectSuccess(parse, "1e1");
    expectSuccess(parse, "1.1e1");
    expectFail(parse, "1e");
    expectFail(parse, "1e1.1");
    expectSuccess(parse, "0b1");
    expectFail(parse, "0b2");
    expectSuccess(parse, "0o333");
    expectFail(parse, "0o9");
    expectSuccess(parse, "0x19af");
    expectFail(parse, "0xg");
  });

  test("array", () => {
    const parse = compile(arrayLiteral);
    expectSuccess(parse, "[]");
    expectFail(parse, "[");
    expectFail(parse, "]");
    expectSuccess(parse, "[   ]", "[]");
    expectSuccess(parse, "[a]", "[a]");
    expectSuccess(parse, "[a,a]");
    expectSuccess(parse, "[,]");
    expectSuccess(parse, "[,,,]");
    expectSuccess(parse, "[a,,a,]");
    expectSuccess(parse, "[[],[]]");
    expectFail(parse, "[[],[]");
    expectFail(parse, "[]]");
    expectSuccess(parse, "[...a]");
    expectSuccess(parse, "[...a,a]");
    expectSuccess(parse, "[...a,...a]");
    expectSuccess(parse, "[...a,...a,]");
    expectFail(parse, "[..a]");
  });

  test("object", () => {
    const parse = compile(objectLiteral);
    expectSuccess(parse, "{}");
    expectSuccess(parse, "{a:1}");
    expectSuccess(parse, "{a:1,}");
    expectSuccess(parse, "{'a':1}");
    expectSuccess(parse, '{"a":1}');
    expectSuccess(parse, "{a:1,b:2}");
    expectSuccess(parse, "{a:1,b:2,}");
    expectSuccess(parse, "{a}");
    expectSuccess(parse, "{a,}");
    expectSuccess(parse, "{a,b}");
    expectSuccess(parse, "{[a]:1}");
    expectFail(parse, "{");
    expectFail(parse, "}");
    expectFail(parse, "{a:}");
    expectFail(parse, "{[a]}");
    expectFail(parse, "{'a'}");
    expectFail(parse, "{,}");
    expectSuccess(parse, "{a:{}}");
    expectSuccess(parse, "{a:{b:{c:1}}}");
    expectFail(parse, "{a:{}");
    expectFail(parse, "{a:{}}}");
    // TODO: Impl a(){} after statement
    // expectSuccess(parse, "{a(){}}");
  });

  test("paren", () => {
    const parse = compile(paren);
    expectSuccess(parse, "(a)");
    expectFail(parse, "(a)=>1");
    // expectSuccess(parse, "{}");
  });

  test("newExpr", () => {
    const parse = compile(newExpr);
    expectSuccess(parse, "new A");
    expectSuccess(parse, "new A()");
    expectSuccess(parse, "new {}");
    expectSuccess(parse, "new A.B");
    expectSuccess(parse, "new A[a]");
    expectSuccess(parse, "new A.Y()");
    expectSuccess(parse, "new Error('xxx')");
  });

  test("primary", () => {
    const parse = compile(primary);
    expectSuccess(parse, "a");
    expectSuccess(parse, "super");
    expectSuccess(parse, "{}");
    expectSuccess(parse, "new A()");
  });

  test("accessible", () => {
    const parse = compile(accessible);
    expectSuccess(parse, "1");
    expectSuccess(parse, "a");
    expectSuccess(parse, "this");
    expectSuccess(parse, "this.a");
    expectSuccess(parse, "this.#a");

    expectSuccess(parse, "import");
    expectSuccess(parse, "import.meta");
    expectSuccess(parse, "a.b");
    expectSuccess(parse, "a[1]");
    expectSuccess(parse, "a?.b");
    expectSuccess(parse, "a!.b");
    expectSuccess(parse, "a.b.c");
    expectSuccess(parse, "a()");
    expectSuccess(parse, "a?.()");
    expectSuccess(parse, "a(1)");
    expectSuccess(parse, "a()()");
    expectSuccess(parse, "new A().x");
    expectSuccess(parse, "a[1]()().x.y");
    expectSuccess(parse, "'a'.toString()");
    expectSuccess(parse, "{}.hasOwnProperty('a')");
    expectSuccess(parse, "super()");

    expectFail(parse, "a..b");
    expectFail(parse, "a.()");
    expectFail(parse, "a.this");
    expectFail(parse, "a.import");
    expectFail(parse, "1.a");
    // function
    expectSuccess(parse, "f()");
    expectSuccess(parse, "f(1)");
    expectSuccess(parse, "f(1,)");
    expectSuccess(parse, "f(1,1,)");
    expectSuccess(parse, "f(1,[])");
    expectSuccess(parse, `f()[0]`);
    expectSuccess(parse, `f[1]`);
    expectSuccess(parse, `input.substr(error.pos).split(" ")[0]`);
  });

  test("unaryExpression", () => {
    const parse = compile(unary);
    expectSuccess(parse, "a");
    expectSuccess(parse, "!a");
    expectSuccess(parse, "!!a");
    expectSuccess(parse, "++a");
    expectSuccess(parse, "--a");
    // expectFail(parse, "++++a");
    expectSuccess(parse, "~a");
    expectSuccess(parse, "~~a");
    expectSuccess(parse, "typeof a");
    expectSuccess(parse, "await a");
    expectSuccess(parse, "void a");
    expectSuccess(parse, "typeof typeof a");
    expectSuccess(parse, "a++");
    expectSuccess(parse, "a--");
    expectSuccess(parse, "a!", "a");
    expectFail(parse, "a----");
  });

  test("destructivePattern", () => {
    const parse = compile(destructive);
    expectSuccessList(parse, [
      "a",
      "a=1",
      `{}`,
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
    ]);
    expectFail(parse, "a.b");
    expectFail(parse, "a[1]");
    expectFail(parse, "[1]");
  });
  test("binary", () => {
    const parse = compile(binary);
    expectSuccessList(parse, [
      "a",
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
      // "(1+1)*1+2/ (3/4)",
      "3/4",
      // "3 / 4 / 5",
      "a in []",
      "a instanceof Array",
      "this.#a",
      "a?.[x]",
      "import.meta",
      "a=1",
      "a??b",
      "1+1",
      "(1)",
    ]);
    expectSuccess(parse, "1 / 2 / 3", "1/2/3");
  });

  test("ternary", () => {
    const parse = compile(ternary);
    expectSuccess(parse, "1?1:1");
    expectSuccess(parse, "1?1+1:1");
    expectSuccess(parse, "1?1+1:1+1");
    expectSuccess(parse, "1?1+1:1?1:1");
    expectSuccess(parse, "1+1?1+1:1?1:1");
    expectSuccess(parse, "(1?1:1)?1+1:1?1:1");
    expectSuccess(parse, "(1?1:1)?1?1:1:1?1:1");
    expectFail(parse, "1?1");
    expectFail(parse, "1??1:1");
    expectFail(parse, "1?:1");
    expectFail(parse, "?:1");
  });

  test("typeExpression", () => {
    const parse = compile(typeExpression);
    expectSuccessList(parse, [
      "number",
      "number[]",
      "number[]|c",
      "number[][]",
      "1",
      "'x'",
      "true",
      "null",
      "`${number}`",
      "Array<T>",
      "Map<string,number>",
      "Array<Array<T[]>>",
      "X<Y>[]",
      "React.ReactNode",
      "React.ChangeEvent<T>",
      "X.Y.Z",
      "()=>1",
      "keyof T",
      "T['K']",
      "T['K']['X']",
      "T['K']['X'].val",
      "string",
      "|a",
      "|a|a",
      "x is number",
      "a|b",
      "a|b|c",
      "a&b",
      "a&b&c",
      "(a)",
      "(a)|(b)",
      "(a&b)&c",
      "{}",
      "[]",
      "typeof A",
      "{a:number;}",
      "{a:number,}",
      "{a:number,b:number}",
      "{a:number,b?:number}",
      "{a?:number}",
      "{a:number,b:{x:1;}}",
      "{a:number;}['a']",
      "{a:()=>void;}",
      "{f():void;}",
      "{async f():void;}",
      "{f(arg:any):void;}",
      "{f(arg:any,):void;}",
      "{f(a1:any,a2:any):void;}",
      "{f(a1:any,a2:any,...args:any):void;}",
      "{f(...args:any):void;}",
      "{f(...args:any):void;b:1;}",
      "{readonly b:number;}",
      `{readonly b:number,a:number}`,
      "[]&{}",
      "[number]",
      "[number,number]",
      "[number,...args:any]",
      "[a:number]",
      "[y:number,...args:any]",
      "()=>void",
      "<T>()=>void",
      "<T=U>()=>void",
      "<T extends X>()=>void",
      "<T extends X=any>()=>void",
      "(a:number)=>void",
      "(a?:number)=>void",
      "(a:A)=>void",
      "(a:A,b:B)=>void",
      "(...args:any[])=>void",
      "(...args:any[])=>A|B",
      "((...args:any[])=>A|B)|()=>void",
      "infer U",
      "{readonly x:number;}",
    ]);
  });

  // it depends expression and as
  test("asExpr", () => {
    const parse = compile(binaryAsExpr);
    is(parse("1"), "1");
    is(parse("1 as number"), "1");
    is(parse("1 + 1 as number"), "1+1");
    is(parse("(a) as number"), "(a)");
    is(parse("(a as number)"), "(a)");
  });

  // simple statement
  test("debugger", () => {
    const parse = compile(debuggerStmt);
    is(parse("debugger"), "debugger");
  });

  test("return", () => {
    const parse = compile(returnLikeStmt, false);
    expectSuccess(parse, "return", "return ");
    expectSuccess(parse, "return ret");
    expectSuccess(parse, "yield 1");
    expectSuccess(parse, "yield ret");
  });
  test("throw", () => {
    const parse = compile(throwStmt, true);
    expectSuccess(parse, "throw 1");
    expectSuccess(parse, "throw new Error()");
    expectSuccess(parse, "throw new Error('xxx')");
    expectFail(parse, "throw");
  });

  test("block", () => {
    const parse = compile(block);
    expectSuccess(parse, `{}`);
    expectSuccess(parse, `{;}`);
    expectSuccess(parse, `{;;;;;;;;;}`);
    expectSuccess(parse, `{debugger;}`);
    expectSuccess(parse, `{1;;}`);
    expectSuccess(parse, `{1}`);
    expectSuccess(parse, `{new X();}`);
    expectSuccess(parse, `{\n}`, "{}");
    expectSuccess(parse, `{\n \n}`, "{}");
    expectFail(parse, ``);
    expectFail(parse, `{}}`);
  });

  test("functionExpression", () => {
    const parse = compile(func);
    expectSuccessList(parse, [
      "function f(){}",
      "function* f(){}",
      "async function f({a})1",
      "function f(a){}",
      "function f(a,){}",
      "function f(a,b){}",
      "function f(a,b,c){}",
      "function f(a,b,c,){}",
      "function f(a,b,c,d){}",
      "function f(a,b,c,...args){}",
      "function f({a,b}){}",
      "function f({a,b})return 1",
      "function f({a})1",
      "function f()1",
    ]);
    // drop types
    is(parse("function f() {}"), "function f(){}");
    is(parse("function f<T extends U>() {}"), "function f(){}");
    is(parse("function f(arg: T){}"), "function f(arg){}");
    is(
      parse("function f(arg: T, ...args: any[]){}"),
      "function f(arg,...args){}"
    );
    is(parse("function f(): void {}"), "function f(){}");
    is(parse("function f(): T {}"), "function f(){}");
    is(parse("function f(): T | U {}"), "function f(){}");
  });
  test("arrowFunctionExpression", () => {
    const parse = compile(arrowFunc);
    // expectSuccess(parse, "a=>1");
    expectSuccessList(parse, [
      "()=>{}",
      "*()=>{}",
      "(a)=>1",
      "(a,b)=>1",
      "(a,b,)=>1",
      "(a,b,c)=>1",
      "(a,b,c,)=>1",
      "({})=>1",
      "async ()=>{}",
      "async ()=>await p",
      "async ()=>await new Promise(r=>setTimeout(r))",
      "a=>1",
      `()=>g`,
    ]);
    expectSuccess(parse, "(a:number)=>1", "(a)=>1");
    expectSuccess(parse, "(a:number):number =>1", "(a)=>1");
    expectSuccess(parse, "(a:number,b:number):number =>1", "(a,b)=>1");
    expectSuccess(parse, "<T>(a:T)=>1", "(a)=>1");
  });

  test("classExpression", () => {
    const parse = compile(classExpr);
    // expectSuccessList(parse, []);
    expectSuccessList(parse, [
      "class X{}",
      "class{}",
      "class X extends Y{}",
      "class{x;}",
      "class{x=1;}",
      "class{x=1;#y=2;}",
      "class{foo(){}}",
      "class{get foo(){}}",
      "class{set foo(){}}",
      "class{async foo(){}}",
      "class{async foo(){}}",
      "class{static async foo(){}}",
    ]);
    is(
      parse("class{readonly onDidChange = Event.None;}"),
      "class{onDidChange=Event.None;}"
    );
    is(parse("class<T>{}"), "class{}");
    is(parse("class{readonly x;}"), "class{x;}");
    is(parse("class X implements A {}"), "class X{}");
    is(parse("abstract class{}"), "class{}");
    is(parse("class { private x; }"), "class{x;}");
    is(parse("class { public x; }"), "class{x;}");
    is(parse("class<T>{}"), "class{}");
    is(parse("class<T> implements X{}"), "class{}");
    is(parse("class<T> extends C implements X{}"), "class extends C{}");
    is(parse("class{foo(): void {} }"), "class{foo(){}}");
    is(parse("class{foo(arg:T): void {} }"), "class{foo(arg){}}");
    is(parse("class{foo<T>(arg:T): void {} }"), "class{foo(arg){}}");
    is(parse("class{x:number;y=1;}"), "class{x;y=1;}");
    is(parse("class{constructor(){}}"), "class{constructor(){}}");
    is(parse("class{constructor(x){}}"), "class{constructor(x){}}");
  });

  test("for", () => {
    const parse = compile(forStatement);
    expectSuccessList(parse, [
      "for(x=0;x<1;x++)x",
      "for(x=0;x<1;x++){}",
      "for(;;)x",
      "for(let x=1;x<6;x++)x",
      "for(let x=1;x<6;x++){}",
      "for(;;){}",
      "for(;x;x){}",
    ]);
    // expectSuccessList(parse, ["for(;;)"]);
  });

  test("for-item", () => {
    const parse = compile(forItemStatement);
    expectSuccessList(parse, [
      "for(const i of array)x",
      "for(const k in array)x",
      "for(let {} in array)x",
      "for(let {} in [])x",
      "for(let [] in xs){}",
    ]);
    expectFail(parse, "for(const i of t)");
  });
  test("while", () => {
    const parse = compile(whileStatement);
    expectSuccessList(parse, ["while(1)1", "while(1){break;}"]);
    expectFail(parse, "while(1)");
  });

  test("if", () => {
    const parse = compile(ifStatement);
    expectSuccessList(parse, [
      "if(1)1",
      `if(1){return 1;}`,
      `if(1){} else 2`,
      `if(1){} else {}`,
      `if(1){} else if(1){}`,
      `if(1){} else if(1){} else 1`,
      `if(1){if(2)return 1}`,
    ]);
  });

  test("switch", () => {
    const parse = compile(switchStatement);
    expectSuccessList(parse, [
      `switch(x){}`,
      `switch(true){default:1}`,
      `switch(true){default:{1}}`,
      `switch(x){case 1:1;}`,
      `switch(x){case 1:1;case 2:2}`,
      `switch(x){case 1:1;case 2:{}}`,
      `switch(x){case 1:case 2:{}}`,
      `switch(x){case 1:{}case 2:{}}`,
      `switch(x){case 1:{}default:{}}`,
    ]);
  });

  test("variableStatement", () => {
    const parse = compile(variableStatement);
    expectSuccessList(parse, [
      "let x",
      "let x,y",
      "let x,y,z",
      "let x,y=1,z",
      "let x=1",
      "const []=[]",
      "const {}={},[]=a",
    ]);
    // expectSuccess(parse, "let x: number = 1, y: number = 2", "");
    expectSuccess(parse, "let x: number = 1, y: number = 2", "let x=1,y=2");
  });

  test("importStatement", () => {
    const parse = compile(importStmt);
    expectSuccessList(parse, [
      "import'foo'",
      "import'foo'",
      "import*as b from'xx'",
      "import*as b from'xx'",
      "import a from'b'",
      'import{}from"b"',
      'import{a}from"x"',
      'import{a,b}from"x"',
      'import{a as b}from"x"',
      'import{a as b,d as c,}from"x"',
    ]);
    // drop import type
    is(parse("import type a from'xxx'"), "");
    is(parse("import type *as b from'xxx'"), "");
    is(parse("import type{a as b}from'xxx'"), "");
  });
  test("exportStatement", () => {
    const parse = compile(exportStatement);
    expectSuccessList(parse, [
      "export{}",
      "export{a}",
      "export{a,b}",
      "export{a as b}",
      "export{a as default}",
      "export{default as default}",
      "export{}from'a'",
      "export{default as x}from'a'",
      "export const x=1",
      "export function f(){}",
      "export class C{}",
    ]);
  });

  test("expressionStatement", () => {
    const parse = compile(expressionStatement);
    expectSuccessList(parse, [
      "1",
      "func()",
      "a=1",
      "a.b=1",
      "1,1",
      "a=1",
      "impor",
      "importS",
      "thisX",
      "new Error('xxx')",
      "/x y/",
      "f(/[ ]{1,}/)",
    ]);
  });

  test("anyStatement", () => {
    const parse = compile(anyStatement);
    expectSuccessList(parse, [
      "debugger",
      "{a=1;}",
      "foo:{}",
      "foo:1",
      "f(/[ ]{1,}/)",
    ]);
  });

  test("transform: class constructor", () => {
    const parse = compile(classExpr);
    is(parse("class{constructor(){}}"), "class{constructor(){}}");
    is(parse("class{constructor(){foo}}"), "class{constructor(){foo}}");
    is(parse("class{constructor(x){}}"), "class{constructor(x){}}");
    is(parse("class{constructor(x=1){}}"), "class{constructor(x=1){}}");
    is(
      parse("class{constructor(private x){}}"),
      "class{constructor(x){this.x=x;}}"
    );
    is(parse("class{constructor(x,y){}}"), "class{constructor(x,y){}}");
    is(parse("class{constructor(x,y,){}}"), "class{constructor(x,y){}}");
    is(
      parse("class{constructor(x=1,y=2,){}}"),
      "class{constructor(x=1,y=2){}}"
    );
    is(
      parse("class{constructor(private x=1){}}"),
      "class{constructor(x=1){this.x=x;}}"
    );
    is(
      parse("class{constructor(x=1,private y,public z=2){}}"),
      "class{constructor(x=1,y,z=2){this.y=y;this.z=z;}}"
    );
    is(
      parse("class{constructor(x=1,private y,public z=2,){}}"),
      "class{constructor(x=1,y,z=2){this.y=y;this.z=z;}}"
    );
    is(
      parse("class{constructor(private x=1){foo;}}"),
      "class{constructor(x=1){this.x=x;foo;}}"
    );
  });

  test("transform: enum", () => {
    const parse = compile(enumStatement);
    is(parse("enum X {}"), "const X={};");
    is(parse("enum X { a }"), `const X={a:0,"0":"a",};`);
    is(parse("enum X { aa }"), `const X={aa:0,"0":"aa",};`);

    is(parse("enum X { a,b }"), `const X={a:0,"0":"a",b:1,"1":"b",};`);
    is(parse("enum X { a = 42, }"), `const X={a:42,"42":"a",};`);
    is(
      parse("enum X { a = 42, b }"),
      `const X={a:42,"42":"a",b:43,"43":"b",};`
    );
    is(parse("enum X { a, b = 42 }"), `const X={a:0,"0":"a",b:42,"42":"b",};`);
    is(parse(`enum X { a = "foo" }`), `const X={a:"foo",};`);
    is(parse(`enum X { a = "foo", b = "bar" }`), `const X={a:"foo",b:"bar",};`);
  });

  test("transform: jsx-self-closing", () => {
    const parse = compile(jsxExpr);
    is(parse("<div />"), `React.createElement("div",{})`);
    is(parse(`<div x="a" y={1} />`), `React.createElement("div",{x:"a",y:1,})`);
    is(
      parse(`<div x="a" y="b" />`),
      `React.createElement("div",{x:"a",y:"b",})`
    );
    is(parse(`<div x={1} />`), `React.createElement("div",{x:1,})`);
    is(parse(`<div x={foo+1} />`), `React.createElement("div",{x:foo+1,})`);
  });
  test("transform: jsx-element", () => {
    const parse = compile(jsxExpr);
    is(parse("<div></div>"), `React.createElement("div",{})`);
    is(parse("<div></xxx>"), { error: true });
    is(parse("<div></xxx></div>"), { error: true });

    is(parse("<div>a</div>"), `React.createElement("div",{},"a")`);
    is(parse("<div>a b</div>"), `React.createElement("div",{},"a b")`);
    is(parse("<div>{a}</div>"), `React.createElement("div",{},a)`);
    is(parse("<div>a{b}c</div>"), `React.createElement("div",{},"a",b,"c")`);
    is(parse("<div>{a}{b}</div>"), `React.createElement("div",{},a,b)`);
    is(parse("<div> {a}</div>"), `React.createElement("div",{},a)`);
    is(parse("<div> {a}</div>"), `React.createElement("div",{},a)`);
  });

  test("transform: jsx-element nested", () => {
    const parse = compile(jsxExpr);
    is(parse("<div><div></div>"), { error: true });
    is(parse("<hr />"), `React.createElement("hr",{})`);
    // const ret = parse("<div><hr /></div>") as any;
    is(
      parse("<a><hr /></a>"),
      `React.createElement("a",{},React.createElement("hr",{}))`
    );
    is(
      parse(`<a href="/">aaa</a>`),
      `React.createElement("a",{href:"/",},"aaa")`
    );
  });

  //     is(parse("<></>"), {
  //       error: false,
  //       result: `React.createElement(React.Fragment,{})`,
  //     });
  //     is(
  //       parse(`<div>
  //   <a href="/">
  //     xxx
  //   </a>
  // </div>`),
  //       {
  //         error: false,
  //         result: `React.createElement("div",{},React.createElement("a",{href:"/",},"xxx"))`,
  //       }
  //     );

  //     is(
  //       parse(`<div>
  //   <a href="/">
  //     xxx
  //   </a>
  // </div>`),
  //       {
  //         error: false,
  //         result: `React.createElement("div",{},React.createElement("a",{href:"/",},"xxx"))`,
  //       }
  //     );

  //     is(parse("<div><></></div>", { jsx: "h", jsxFragment: "Fragment" }), {
  //       error: false,
  //       result: `h("div",{},h(Fragment,{}))`,
  //     });
  // });

  run({ stopOnFail: true, stub: true, isMain });
}
