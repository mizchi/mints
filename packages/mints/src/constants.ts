// import { debuggerStatement } from './statements';
// export enum NodeTypes {
// Root
export const Program = 512;
export const Block = 513;
export const BlockStatement = 514;
export const LabeledStatement = 515;
export const DebuggerStatement = 516;
export const ReturnStatement = 517;
export const yieldStatement = 518;
export const VariableStatement = 519;
export const ThrowStatement = 520;
export const BreakStatement = 521;
export const EmptyStatement = 522;
export const ExpressionStatement = 523;
export const NonEmptyStatement = 524;
export const AnyStatement = 525;
export const IfStatement = 526;
export const InterfaceStatement = 527;
export const DoWhileStatement = 528;
export const WhileStatement = 529;
export const ForStatement = 530;
export const ForItemStatement = 531;
export const SwitchStatement = 532;
export const ImportStatement = 533;
export const ExportStatement = 534;
export const DeclareVariableStatement = 535;
export const TypeStatement = 536;
export const Expression = 537;
export const AsExpression = 538;
export const ClassExpression = 539;
export const AnyExpression = 540;
export const Identifier = 541;
export const TernaryExpression = 542;
export const ParenExpression = 543;
export const LefthandSideExpression = 544;
export const CallExpression = 545;
export const MemberExpression = 546;
export const UnaryExpression = 547;
export const BinaryExpression = 549;
export const FunctionExpression = 550;
export const ArrowFunctionExpression = 551;
export const AnyLiteral = 552;
export const StringLiteral = 553;
export const RegExpLiteral = 554;
export const NumberLiteral = 555;
export const TemplateLiteral = 556;
export const BooleanLiteral = 557;
export const NullLiteral = 558;
export const ArrayLiteral = 559;
export const ObjectLiteral = 560;
export const TypeExpression = 561;
export const TypeUnaryExpression = 562;
export const TypeBinaryExpression = 563;
export const TypeLiteral = 564;
export const TypeReference = 565;
export const TypeFunction = 566;
export const TypeAnnotation = 567;
export const TypeObjectLiteral = 568;
export const TypeArrayLiteral = 569;
export const TypeParameters = 570;
export const TypeDeclareParameters = 571;
export const TypeIdentifier = 572;
export const TypeFunctionExpression = 573;
export const Argument = 574;
export const Arguments = 575;
export const DestructivePattern = 576;
export const DestructiveObjectPattern = 578;
export const DestructiveArrayPattern = 579;
export const ClassField = 580;

export const _ = "([\\s\\n]+)?";
export const __ = "\\s+";
export const SYMBOL = "([a-zA-Z_$][a-zA-Z0-9_$]*)";
export const PAIRED_CHARS = ["(", ")", "{", "}", "[", "]", "<", ">"] as const;

export const REST_SPREAD = "\\.\\.\\.";
export const OPERATORS = [
  // relation
  "instanceof",
  "in",

  // 3 chars
  "\\>\\>\\>",
  "\\=\\=\\=",
  "\\!\\=\\=",

  // 2 chars
  "\\|\\|",
  "\\&\\&",
  "\\*\\*",
  "\\>\\=",
  "\\<\\=",
  "\\=\\=",
  "\\!\\=",
  "\\<\\<",
  "\\>\\>",

  "\\+\\=",
  "\\-\\=",
  "\\*\\=",
  "\\|\\=",
  "\\/\\=",
  "\\?\\?",

  // 1 chars
  "\\+",
  "\\-",
  "\\|",
  "\\&",
  "\\*",
  "\\/",
  "\\>",
  "\\<",
  "\\^",
  "\\%",
  "\\=",
];

const KEYWORDS = [
  "break",
  "do",
  "instanceof",
  "typeof",
  "case",
  "else",
  "new",
  "var",
  "catch",
  "finally",
  "return",
  "void",
  "continue",
  "for",
  "switch",
  "while",
  "debugger",
  "function",
  "this",
  "with",
  "default",
  "if",
  "throw",
  "delete",
  "in",
  "try",
  // Future reserved words
  "class",
  "enum",
  "extends",
  "super",
  "const",
  "export",
  "import",
  "implements",
  "let",
  "private",
  "public",
  "yield",
  "interface",
  "package",
  "protected",
  "static",
] as const;

export const LITERAL_KEYWORDS = ["null", "true", "false"] as const;

export const RESERVED_WORDS = [...KEYWORDS, ...LITERAL_KEYWORDS] as const;
