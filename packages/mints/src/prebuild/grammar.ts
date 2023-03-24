import type { ParseError } from "../../../pargen/src/types";
import {
  $any,
  $atom,
  $def,
  $not,
  $opt,
  $opt_seq,
  $or,
  $regex,
  $repeat,
  $repeat_seq,
  $seq,
  $seqo,
  $skip,
  $skip_opt,
  $token,
} from "../../../pargen/src/builder";

import {
  ACCESS,
  ARGS,
  ASSIGN,
  ATTRIBUTES,
  BODY,
  CHILDREN,
  DOTDOTDOT,
  IDENT,
  INIT,
  ITEMS,
  K_ABSTRACT,
  K_AS,
  K_ASYNC,
  K_AWAIT,
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
  K_YIELD,
  LAST,
  L_BRACE,
  L_PAREN,
  NAME,
  R_BRACE,
  R_PAREN,
  VALUE,
} from "./constants";

const thisKeyword = K_THIS;
const importKeyword = K_IMPORT;
const plusPlus = $seq(["+", "+"]);
const minusMinus = $seq(["-", "-"]);
const dotDotDot = $def(() => $seq([".", ".", "."]));

const whitespace = $def(() => $any(0, createWhitespacePtr));

const identifier = $def(() => $atom(identParserPtr));

const objectMemberIdentifier = $regex(
  `^[^~&<>!:;,@$='"\`\\{\\}\\(\\)\\[\\]\\^\\?\\.\\*\\/\\\\]+$`,
);

const typeDeclareParameter = $def(() =>
  $seq([
    typeExpression,
    // extends T
    $opt($seq([whitespace, K_EXTENDS, whitespace, typeExpression])),
    $opt($seq(["=", $not([">"]), typeExpression])),
  ]),
);

// declare parameters
// ex. <T extends U = V>
const typeDeclareParameters = $def(() =>
  $seq([
    "<",
    $repeat_seq([typeDeclareParameter, ","]),
    $seq([typeDeclareParameter, $opt(",")]),
    ">",
  ]),
);

// apply parameters
const typeParameters = $def(() =>
  $seq([
    "<",
    $repeat_seq([typeExpression, ","]),
    $seq([typeExpression, $opt(",")]),
    ">",
  ]),
);

const typeParen = $def(() =>
  $seq([
    L_PAREN,
    typeExpression,
    R_PAREN,
    $opt(typeParameters),
    $not([$seq(["=", ">"])]),
  ]),
);

const typeIdentifier = $def(() =>
  $seq([
    $not([$seq([K_READONLY, whitespace])]),
    $or([K_VOID, $seq([identifier, $opt(typeParameters)])]),
  ]),
);

const typePrimary = $def(() =>
  $or([typeParen, typeObjectLiteral, typeArrayLiteral, typeIdentifier]),
);

const typeReference = $def(() =>
  $seq([
    typePrimary,
    $repeat(
      $or([
        $seq([".", typeIdentifier]),
        $seq(["[", $opt(typeExpression), "]"]),
      ]),
    ),
  ]),
);

const typeNameableItem = $def(() =>
  $or([
    $seq([identifier, $opt(K_QUESTION), ":", typeExpression]),
    typeExpression,
  ]),
);

const typeArrayLiteral = $def(() =>
  $seq([
    "[",
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
      ]),
    ),
    "]",
  ]),
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
      ]),
    ),
  ]),
);

const typeObjectItem = $def(() =>
  $or([
    // call signature: {(): void;}
    $seq([
      // $opt(typeDeclareParameters),
      L_PAREN,
      typeFunctionArgs,
      R_PAREN,
      ":",
      typeExpression,
    ]),
    // member
    $seq([
      $opt($seq([K_ASYNC, whitespace])),
      objectMemberIdentifier,
      $opt(typeDeclareParameters),
      L_PAREN,
      typeFunctionArgs,
      R_PAREN,
      $opt(K_QUESTION),
      ":",
      typeExpression,
    ]),
    // member
    $seq([
      $opt($seq([K_READONLY, whitespace])),
      $or([
        // [key:string]
        $seq(["[", objectMemberIdentifier, ":", typeExpression, "]"]),
        // key
        objectMemberIdentifier,
      ]),
      // identifier,
      $opt(K_QUESTION),
      ":",
      typeExpression,
    ]),
  ]),
);

const typeObjectLiteral = $def(() =>
  $seq([
    // object
    L_BRACE,
    $repeat_seq([typeObjectItem, $or([",", ";"])]),
    $opt(typeObjectItem),
    $opt($or([",", ";"])),
    R_BRACE,
  ]),
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
  ]),
);

const typeFunctionExpression = $def(() =>
  $seq([
    $opt(typeDeclareParameters),
    L_PAREN,
    typeFunctionArgs,
    R_PAREN,
    "=",
    ">",
    typeExpression,
  ]),
);

const typeUnaryExpression = $def(() =>
  $seq([
    $opt($seq([$or(["keyof", K_TYPEOF, "infer"]), whitespace])),
    $or([typeFunctionExpression, typeParen, typeReference, typeLiteral]),
  ]),
);

const typeBinaryExpression = $def(() =>
  $seq([
    $opt($or(["|", "&"])),
    $repeat_seq([
      typeUnaryExpression,
      $or(["|", "&", $seq([whitespace, "is", whitespace])]),
    ]),
    typeUnaryExpression,
  ]),
);

const typeExpression = $def(() => typeBinaryExpression);

// Destructive Pattren
const destructiveArrayPattern = $def(() =>
  $seq([
    "[",
    $repeat_seq([$opt($seq([destructive, $opt(assign)])), ","]),
    $or([
      $seq([dotDotDot, identifier]),
      $seq([$or([$seq([destructive])]), $opt(assign), $opt(",")]),
      $seq([$opt(",")]),
    ]),
    "]",
  ]),
);

const destructiveObjectItem = $def(() =>
  $seq([
    $or([$seq([objectMemberIdentifier, ":", destructive]), identifier]),
    $opt(assign),
  ]),
);

const destructiveObjectPattern = $def(() =>
  $seq([
    L_BRACE,
    $repeat_seq([destructiveObjectItem, ","]),
    $opt($or([$seq([dotDotDot, identifier]), destructiveObjectItem])),
    R_BRACE,
  ]),
);

const destructive = $def(() =>
  $seq([
    $or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    $opt(assign),
  ]),
);

const funcArgWithAssign = $def(() =>
  $seq([
    $or([destructiveObjectPattern, destructiveArrayPattern, identifier]),
    $skip_opt($seq([$skip_opt(K_QUESTION), ":", typeExpression])),
    $opt_seq([$skip_opt(K_QUESTION), "=", $not([">"]), anyExpression]),
  ]),
);

const funcArgs = $def(() =>
  $seq([
    $repeat_seq([funcArgWithAssign, ","]),
    $opt($or([$seq([dotDotDot, funcArgWithAssign]), funcArgWithAssign])),
    $skip_opt(","),
  ]),
);

const callArguments = $def(() =>
  $seq([
    $repeat_seq([anyExpression, ","]),
    $or([$seq([dotDotDot, anyExpression]), anyExpression, $any(0)]),
  ]),
);

/* Expression */

const stringLiteral = $def(() =>
  $or([
    $seq(["'", $opt($seq([$not(["'"]), $any(1)])), "'"]),
    $seq(['"', $opt($seq([$not(['"']), $any(1)])), '"']),
  ]),
);

const regexpLiteral = $def(() =>
  $seq(["/", $regex(`^[^\/]+$`), "/", $opt($regex(`^[gimsuy]+$`))]),
);

const templateExpressionStart = $token("${");
const templateLiteralString = $def(() => $seq([$not(["`"]), $any(1)])); // TODO: mu

const templateLiteral = $def(() =>
  $seq([
    "`",
    $repeat_seq([
      $opt($seq([$not([templateExpressionStart]), templateLiteralString])),
      templateExpressionStart,
      anyExpression,
      R_BRACE,
    ]),
    $opt(templateLiteralString),
    "`",
  ]),
);

const digit = $regex(`^[1-9](_?\\d)*$`);
const digitWithSuffix = $regex(`^[1-9](_?\\d)*(e[1-9]\\d*)?$`);
const numberLiteral = $def(() =>
  $or([
    $regex(`^0[bB][0-1]+$`),
    $regex(`^0[oO][0-8]+$`),
    $regex(`^0[xX][0-9a-f]+$`),
    $seq([$or([digit, "0"]), ".", digitWithSuffix]),
    digitWithSuffix,
    "0",
  ]),
);

const booleanLiteral = $def(() => $or([K_TRUE, K_FALSE]));
const nullLiteral = $def(() => K_NULL);

const arrayItem = $def(() =>
  $seq([$opt($seq([".", ".", "."])), anyExpression]),
);
const arrayLiteral = $def(() =>
  $seq([
    // [a,...b,]
    "[",
    $repeat_seq([$opt(arrayItem), ","]),
    $opt(arrayItem),
    "]",
  ]),
);

// key: val
const objectItem = $def(() =>
  $or([
    $seq([".", ".", ".", anyExpression]),
    $seq([
      // function

      $opt_seq([$or([K_ASYNC, K_GET, K_SET]), $not(["("]), whitespace]),

      // generator
      $opt("*"),

      $or([
        stringLiteral,
        $seq(["[", anyExpression, "]"]),
        objectMemberIdentifier,
      ]),
      $seq([
        L_PAREN,
        funcArgs,
        R_PAREN,
        $skip_opt($seq([":", typeExpression])),
        block,
      ]),
    ]),
    $seq([
      $or([
        stringLiteral,
        $seq(["[", anyExpression, "]"]),
        objectMemberIdentifier,
      ]),
      ":",
      anyExpression,
    ]),
    // shothand
    objectMemberIdentifier,
  ]),
);

// ref by key
const objectLiteral = $def(() =>
  $seq([
    L_BRACE,
    $repeat($seq([objectItem, ","])),
    $opt($seq([objectItem, $opt(",")])),
    R_BRACE,
  ]),
);

/* Class */
const accessModifier = $or([K_PRIVATE, K_PUBLIC, K_PROTECTED]);
const getOrSetModifier = $or([K_GET, K_SET]);

const classConstructorArg = $def(() =>
  $seqo(
    [
      // name
      [
        IDENT,
        $or([
          // private x
          $seqo([
            [ACCESS, accessModifier],
            [IDENT, identifier],
            // $skip_opt($seq([K_QUESTION, ":", typeExpression])),
          ]),
          // x
          destructiveObjectPattern,
          destructiveArrayPattern,
          identifier,
        ]),
      ],
      // :number
      $skip_opt($seq([$opt(K_QUESTION), ":", typeExpression])),
      // =v
      [{ key: INIT, opt: true }, $seq(["=", $not([">"]), anyExpression])],
    ],
    reshapeClassConstructorArgPtr,
  ),
);

const classConstructor = $def(() =>
  $seqo<any, any>(
    [
      $skip_opt(accessModifier),
      K_CONSTRUCTOR,
      L_PAREN,
      [ARGS, $repeat($seq([classConstructorArg, $skip(",")]))],
      [{ key: LAST, opt: true }, $seq([classConstructorArg, $skip_opt(",")])],
      R_PAREN,
      L_BRACE,
      [BODY, lines],
      R_BRACE,
    ],
    reshapeClassConstructorPtr,
  ),
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
      $skip_opt(typeDeclareParameters),
      L_PAREN,
      funcArgs,
      R_PAREN,
      $skip_opt(typeAnnotation),
      block,
    ]),
    // field
    $seq([
      $skip_opt(accessModifier),
      $opt_seq([K_STATIC, whitespace]),
      $skip_opt($seq([K_READONLY, whitespace])),
      $opt_seq(["#"]),
      identifier,
      $skip_opt(typeAnnotation),
      $opt_seq(["=", $not([">"]), anyExpression]),
      ";",
    ]),
  ]),
);

const classExpr = $def(() =>
  $seq([
    $skip_opt(K_ABSTRACT),
    K_CLASS,
    $opt($seq([whitespace, identifier])),
    $skip_opt(typeDeclareParameters),
    $opt($seq([whitespace, K_EXTENDS, whitespace, anyExpression])),
    $skip_opt($seq([K_IMPLEMENTS, typeExpression])),
    L_BRACE,
    $repeat(classField),
    R_BRACE,
  ]),
);

const functionExpression = $def(() =>
  $seq([
    $opt($seq([K_ASYNC, whitespace])),
    K_FUNCTION,
    $opt("*"),
    $opt($seq([whitespace, identifier])),
    $skip_opt(typeDeclareParameters),
    L_PAREN,
    funcArgs,
    R_PAREN,
    $skip_opt(typeAnnotation),
    $or([block, anyStatement]),
  ]),
);

const arrowFunctionExpression = $def(() =>
  $seq([
    $opt($seq([K_ASYNC, whitespace])),
    $skip_opt(typeDeclareParameters),
    $opt("*"),
    $or([
      $seq([L_PAREN, funcArgs, R_PAREN, $skip_opt(typeAnnotation)]),
      identifier,
    ]),
    "=",
    ">",
    $or([block, anyStatement]),
  ]),
);

const newExpr = $def(() => $seq([K_NEW, whitespace, accessible]));

const paren = $def(() =>
  $seq([L_PAREN, anyExpression, R_PAREN, $not([$seq(["=", ">"])])]),
);

const primary = $def(() =>
  $or([
    functionExpression,
    arrowFunctionExpression,
    jsxExpr,
    paren,
    newExpr,
    objectLiteral,
    arrayLiteral,
    stringLiteral,
    regexpLiteral,
    templateLiteral,
    K_SUPER,
    thisKeyword,
    importKeyword,
    objectLiteral,
    arrayLiteral,
    stringLiteral,
    templateLiteral,
    regexpLiteral,
    identifier,
    paren,
  ]),
);

const access = $def(() =>
  $or([
    $seq(["[", anyExpression, "]"]),
    $seq([
      $opt_seq(["?", "."]),
      $skip_opt(typeParameters),
      L_PAREN,
      callArguments,
      R_PAREN,
    ]),
    $seq([$opt($or(["!", "?"])), ".", $opt("#"), objectMemberIdentifier]),
    // $seq([$opt($or(["!", "?"])), ".", $opt("#"), objectMemberIdentifier]),
    $seq([$opt($seq(["?", "."])), "[", anyExpression, "]"]),
  ]),
);

const accessible = $def(() =>
  $or([
    // before paren required
    arrowFunctionExpression,
    $seq([primary, $repeat(access)]),
    booleanLiteral,
    numberLiteral,
    nullLiteral,
  ]),
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
        // $seq(["!", $not(["="])]),
        "-",
      ]),
      unary,
    ]),
    $seq([
      $or([classExpr, accessible]),
      $opt($or([plusPlus, minusMinus])),
      // $not(["!", "="]),
      $skip_opt($seq(["!", $not(["="])])),
      $not(["`"]),
    ]),
    // tagged template
    $seq([accessible, templateLiteral]),
  ]),
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
  ]),
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
  ]),
);

// a ? b: c
const ternary = $def(() =>
  $or([
    $seq([binaryAsExpr, K_QUESTION, anyExpression, ":", anyExpression]),
    binaryAsExpr,
  ]),
);

const anyExpression = ternary;

const typeAnnotation = $seq([":", typeExpression]);
const breakStmt = $def(() => K_BREAK);
const continueStmt = $def(() => K_CONTINUE);
const debuggerStmt = $def(() => K_DEBUGGER);

// it includes yield and throw
const returnLikeStmt = $def(() =>
  $seq([$or([K_RETURN, K_YIELD]), $opt_seq([whitespace, anyExpression])]),
);
const throwStmt = $def(() =>
  $seq([K_THROW, whitespace, $or([newExpr, anyExpression])]),
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
        L_BRACE,
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
              $seq([whitespace, K_AS, whitespace, identifier, $skip_opt(",")]),
            ),
          ]),
        ),
        R_BRACE,
      ]),
    ]),
    K_FROM,
    stringLiteral,
  ]),
);

const importStmt = $def(() =>
  $or([
    // import 'specifier';
    $seq([K_IMPORT, stringLiteral]),
    // import type
    $seq([$skip($seq([K_IMPORT, K_TYPE, _importRightSide]))]),
    // import pattern
    $seq([K_IMPORT, _importRightSide]),
  ]),
);

const defaultOrIdentifer = $or([K_DEFAULT, identifier]);

const exportStatement = $def(() =>
  $or([
    // export clause
    $seq([
      K_EXPORT,
      L_BRACE,
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
        ]),
      ),
      R_BRACE,
      $opt($seq([K_FROM, stringLiteral])),
    ]),
    // export named expression
    $seq([
      K_EXPORT,
      whitespace,
      $or([variableStatement, functionExpression, classExpr]),
    ]),
    $seq([$skip($seq([K_EXPORT, $or([typeStatement, interfaceStatement])]))]),
    // default export
    $seq([K_EXPORT, whitespace, K_DEFAULT, whitespace, anyExpression]),
  ]),
);

const ifStatement = $def(() =>
  $seq([
    K_IF,
    L_PAREN,
    anyExpression,
    R_PAREN,
    blockOrStmt,
    $opt(
      $seq([
        whitespace,
        K_ELSE,
        $or([
          // xx
          block,
          $seq([whitespace, anyStatement]),
        ]),
      ]),
    ),
  ]),
);

const switchStatement = $def(() =>
  $seq([
    K_SWITCH,
    L_PAREN,
    anyExpression,
    R_PAREN,
    L_BRACE,
    $repeat_seq([
      K_CASE,
      whitespace,
      anyExpression,
      ":",
      $opt(
        $or([
          $seq([
            // xxx
            $or([block, caseClause]),
            $opt(";"),
          ]),
          lines,
        ]),
      ),
    ]),
    $opt($seq([K_DEFAULT, ":", $or([block, caseClause])])),
    R_BRACE,
  ]),
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
  ]),
);

const declareVariableStatement = $def(() =>
  $seq([$skip($seq([K_DECLARE, variableStatement]))]),
);

const typeStatement = $def(() =>
  $seq([
    $skip(
      $seq([
        K_TYPE,
        identifier,
        $opt(typeDeclareParameters),
        "=",
        $not([">"]),
        typeExpression,
      ]),
    ),
  ]),
);

const interfaceStatement = $def(() =>
  $seq([
    $skip(
      $seq([
        K_INTERFACE,
        identifier,
        $opt($seq([K_EXTENDS, whitespace, typeExpression])),
        typeObjectLiteral,
      ]),
    ),
  ]),
);

const forStatement = $def(() =>
  $seq([
    K_FOR,
    L_PAREN,
    $opt($or([variableStatement, anyExpression])),
    ";",
    $opt(anyExpression),
    ";",
    $opt(anyExpression),
    R_PAREN,
    blockOrStmt,
  ]),
);

const variableType = $or([K_VAR, K_CONST, K_LET]);

const forItemStatement = $def(() =>
  $seq([
    K_FOR,
    // $opt_seq([K_AWAIT, whitespace]),
    L_PAREN,
    $seq([variableType, whitespace]),
    destructive,
    whitespace,
    $or(["of", "in"]),
    whitespace,
    anyExpression,
    R_PAREN,
    blockOrStmt,
  ]),
);

const whileStatement = $def(() =>
  $seq([K_WHILE, L_PAREN, anyExpression, R_PAREN, blockOrStmt]),
);

const doWhileStatement = $def(() =>
  $or([
    $seq([
      K_DO,
      $or([$seq([block]), $seq([anyStatement])]),
      K_WHILE,
      L_PAREN,
      anyExpression,
      R_PAREN,
    ]),
  ]),
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
          $opt($seq([L_PAREN, anyExpression, R_PAREN])),
          block,
          $opt($seq([_finally])),
        ]),
        _finally,
      ]),
    ]),
  ]),
);

const enumAssign = $def(() =>
  $seq([$skip("="), $or([numberLiteral, stringLiteral])]),
);

const enumStatement = $def(() =>
  $seqo(
    [
      K_ENUM,
      whitespace,
      [NAME, identifier],
      L_BRACE,
      [
        ITEMS,
        $repeat(
          $seqo([
            [IDENT, identifier],
            [{ key: ASSIGN, opt: true }, enumAssign],
            $skip(","),
          ]),
        ),
      ],
      [
        { key: LAST, opt: true },
        $seqo([
          [IDENT, identifier],
          [{ key: ASSIGN, opt: true }, enumAssign],
          $skip_opt(","),
        ]),
      ],
      R_BRACE,
    ],
    reshapeEnumPtr,
  ),
);

const jsxInlineExpr = $seq([$skip("{"), anyExpression, $skip("}")]);

const jsxText = $def(() => $atom(parseJsxTextPtr));

const jsxAttributes = $repeat(
  $or([
    $seqo([
      [NAME, objectMemberIdentifier],
      [
        { key: VALUE, opt: true },
        $seq([$skip("="), $or([stringLiteral, jsxInlineExpr])]),
      ],
    ]),
    $seqo(["{", [DOTDOTDOT, dotDotDot], [NAME, anyExpression], "}"]),
  ]),
);

const jsxFragment = $def(() =>
  $seqo(
    [
      "<",
      ">",
      [
        CHILDREN,
        $repeat(
          $or([
            jsxSelfCloseElement,
            jsxElement,
            jsxFragment,
            jsxInlineExpr,
            jsxText,
          ]),
        ),
      ],
      "<",
      "/",
      ">",
    ],
    reshapeJsxElementPtr,
  ),
);

const jsxElement = $def(() =>
  $seqo(
    [
      "<",
      [{ key: IDENT, push: true }, accessible],
      $skip_opt(typeDeclareParameters),
      [ATTRIBUTES, jsxAttributes],
      ">",
      [
        CHILDREN,
        $repeat(
          $or([
            jsxSelfCloseElement,
            jsxElement,
            jsxFragment,
            jsxInlineExpr,
            jsxText,
          ]),
        ),
      ],
      "<",
      "/",
      [
        {
          key: "close",
          pop: popJsxElementPtr,
        },
        $or([accessible, ""]),
      ],
      ">",
    ],
    reshapeJsxElementPtr,
    // xxx
  ),
);

const jsxSelfCloseElement = $def(() =>
  $seqo(
    [
      "<",
      // $debug_next_token,
      [IDENT, accessible],
      // $skip_opt(typeDeclareParameters),
      [ATTRIBUTES, jsxAttributes],
      "/",
      ">",
    ],
    reshapeJsxSelfClosingElementPtr,
  ),
);

const jsxExpr = $def(() => $or([jsxSelfCloseElement, jsxElement, jsxFragment]));

const expressionStatement = $def(() =>
  $seq([anyExpression, $repeat_seq([",", anyExpression])]),
);

const semicolonlessStatement = $def(() =>
  $seq([
    $or([
      // export function/class
      $seq([K_EXPORT, whitespace, $or([functionExpression, classExpr])]),
      classExpr,
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
      blockStmt,
    ]),
  ]),
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
    $or([
      debuggerStmt,
      breakStmt,
      throwStmt,
      returnLikeStmt,
      declareVariableStatement,
      variableStatement,
      importStmt,
      exportStatement,
      typeStatement,
      labeledStmt,
      expressionStatement,
    ]),
  ]),
);

export const anyStatement = $def(() =>
  //  $or([semicolonlessStatement, semicolonRequiredStatement])
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
  ]),
);

export const line = $def(() =>
  $or([
    $seq([semicolonlessStatement, $opt(";")]),
    $seq([$opt(semicolonRequiredStatement), ";"]),
  ]),
);

const lines = $def(() => $seq([$repeat(line), $opt(anyStatement), $opt(";")]));

const block = $def(() => $seq([L_BRACE, lines, R_BRACE]));

const caseClause = $def(() =>
  $seq([
    $repeat_seq([$not([K_CASE]), line]),
    $opt($seq([$not([K_CASE]), anyStatement])),
    $skip_opt(";"),
  ]),
);

export const program = lines;

import { Rule } from "../../../pargen/src/types";
import { parseTokens } from "../runtime/tokenizer";

import { compile as compileRaw } from "./ctx";
import { CODE_SEQ_STOP } from "../../../pargen/src/constants";
import {
  createWhitespacePtr,
  identParserPtr,
  parseJsxTextPtr,
  popJsxElementPtr,
  reshapeClassConstructorArgPtr,
  reshapeClassConstructorPtr,
  reshapeEnumPtr,
  reshapeJsxElementPtr,
  reshapeJsxSelfClosingElementPtr,
} from "../runtime/funcs";
import { detectInlineOptions } from "../runtime/options";

// if (process.env.NODE_ENV === "test") {
import { is } from "@mizchi/test";

if (import.meta.vitest) {
  const { test } = import.meta.vitest;
  const compile = (
    inputRule: Rule | number,
  ): ((input: string) => string | ParseError) => {
    const parser = compileRaw(inputRule);
    const wrappedParser = (input: string) => {
      let tokens: string[] = [];
      for (const next of parseTokens(input)) {
        if (next === "\n") continue;
        tokens.push(next);
      }

      const opts = detectInlineOptions(input);
      const out = parser(
        tokens,
        {
          jsx: opts.jsx ?? "React.createElement",
          jsxFragment: opts.jsxFragment ?? "React.Fragment",
        },
        0,
      );
      if (out.error) {
        return out;
      } else {
        return out.xs
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

  const expectFail = (parse: any, input: string) => {
    const parsed = parse(input);
    if (!parsed.error)
      throw new Error("Unexpected Success:" + JSON.stringify(parsed));
  };

  // preloading
  // compile(program);

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
    expectSuccess(parse, "'\\''");

    expectFail(parse, "");
    is(parse("'hello"), {
      error: true,
      detail: [CODE_SEQ_STOP],
    });
    is(parse("hello'"), {
      error: true,
      detail: [CODE_SEQ_STOP],
    });
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
    expectSuccess(parse, "{a(){}}");
    expectSuccess(parse, "{a(b){1;}}");
    expectSuccess(parse, "{a(b=1,c=2){1;}}");
    expectSuccess(parse, "{static:1}");

    // NOTE: get() function
    expectSuccess(parse, "{get x(){}}");
    expectSuccess(parse, "{get get(){}}");
    expectSuccess(parse, "{get(){}}");
    expectSuccess(parse, "{get():void{}}", "{get(){}}");
  });

  test("paren", () => {
    const parse = compile(paren);
    expectSuccess(parse, "(a)");
    expectFail(parse, "(a)=>1");
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
    expectSuccess(parse, "-a");
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
      "{static:_static}",
      "{get:_1}",
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
    expectSuccess(parse, "1!==1");
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
      "{[key:string]:v}",
      "{():void;}",
      "typeof api",
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
    const parse = compile(returnLikeStmt);
    expectSuccess(parse, "return", "return");
    expectSuccess(parse, "return ret");
    expectSuccess(parse, "yield 1");
    expectSuccess(parse, "yield ret");
  });

  test("throw", () => {
    const parse = compile(throwStmt);
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
    const parse = compile(functionExpression);
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
    is(parse("function f<T extends U,>() {}"), "function f(){}");

    is(parse("function f(arg: T){}"), "function f(arg){}");
    is(
      parse("function f(arg: T, ...args: any[]){}"),
      "function f(arg,...args){}",
    );
    is(parse("function f(): void {}"), "function f(){}");
    is(parse("function f(): T {}"), "function f(){}");
    is(parse("function f(): T | U {}"), "function f(){}");
  });
  test("arrowFunctionExpression", () => {
    const parse = compile(arrowFunctionExpression);
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
      "class{onDidChange=Event.None;}",
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
      `if(1){} else{}`,
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
    expectSuccess(parse, "type X<A>=T", "");
    expectSuccess(parse, "export type X<A>=T", "");
  });

  test("transform: class constructor", () => {
    const parse = compile(classExpr);

    is(parse("class{constructor(){}}"), "class{constructor(){}}");
    is(parse("class{constructor(){foo}}"), "class{constructor(){foo}}");
    is(parse("class{constructor(x){}}"), "class{constructor(x){}}");
    is(parse("class{constructor(x=1){}}"), "class{constructor(x=1){}}");
    is(
      parse("class{constructor(private x){}}"),
      "class{constructor(x){this.x=x;}}",
    );
    is(parse("class{constructor(x,y){}}"), "class{constructor(x,y){}}");
    is(parse("class{constructor(x,y,){}}"), "class{constructor(x,y){}}");
    is(
      parse("class{constructor(x=1,y=2,){}}"),
      "class{constructor(x=1,y=2){}}",
    );
    is(
      parse("class{constructor(private x=1){}}"),
      "class{constructor(x=1){this.x=x;}}",
    );
    is(
      parse("class{constructor(x=1,private y,public z=2){}}"),
      "class{constructor(x=1,y,z=2){this.y=y;this.z=z;}}",
    );
    is(
      parse("class{constructor(x=1,private y,public z=2,){}}"),
      "class{constructor(x=1,y,z=2){this.y=y;this.z=z;}}",
    );
    is(
      parse("class{constructor(private x=1){foo;}}"),
      "class{constructor(x=1){this.x=x;foo;}}",
    );

    is(
      parse(`class Point {constructor(private x: number) {} }`),
      "class Point{constructor(x){this.x=x;}}",
    );
    is(
      parse(
        `class Point {constructor(private x: number, public y?: number) {} }`,
      ),
      "class Point{constructor(x,y){this.x=x;this.y=y;}}",
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
      `const X={a:42,"42":"a",b:43,"43":"b",};`,
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
      `React.createElement("div",{x:"a",y:"b",})`,
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
    is(parse("<div a='1'></div>"), `React.createElement("div",{a:'1',})`);
    is(parse("<div {...x}></div>"), `React.createElement("div",{...x,})`);
    is(
      parse("<div {...{x:1}}></div>"),
      `React.createElement("div",{...{x:1},})`,
    );
    is(
      parse("<div {...x} y={1}></div>"),
      `React.createElement("div",{...x,y:1,})`,
    );
    is(
      parse("<div {...x} y={1} {...z}></div>"),
      `React.createElement("div",{...x,y:1,...z,})`,
    );
    is(parse("<div a />"), `React.createElement("div",{a:true,})`);
  });

  test("transform: jsx-element nested", () => {
    const parse = compile(jsxExpr);
    is(parse("<div><div></div>"), { error: true });
    is(parse("<hr />"), `React.createElement("hr",{})`);
    // const ret = parse("<div><hr /></div>") as any;
    is(
      parse("<a><hr /></a>"),
      `React.createElement("a",{},React.createElement("hr",{}))`,
    );
    is(
      parse(`<a href="/">aaa</a>`),
      `React.createElement("a",{href:"/",},"aaa")`,
    );
  });
  test("transform: jsx-fragment", () => {
    const parse = compile(jsxExpr);
    is(parse("<></>"), `React.createElement(React.Fragment,{})`);
    is(parse("<>text</>"), `React.createElement(React.Fragment,{},"text")`);
  });
}
