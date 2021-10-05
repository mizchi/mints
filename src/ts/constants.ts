// import { debuggerStatement } from './statements';
export enum NodeTypes {
  NONE = 512,
  // Statements
  DebuggerStatement,
  EmptyStatement,
  AnyStatement,

  // Expression
  AnyExpression,
  Identifier,
  ParenExpression,
  LefthandSideExpression,
  CallExpression,
  // UnaryCallExpression,
  MemberExpression,
  // UnaryMemberExpression,

  UnaryExpression,
  ExpressionStatement,
  BinaryExpression,
  PropertyAccessExpression,

  // Literal
  AnyLiteral,
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  NullLiteral,
  ArrayLiteral,
  ObjectLiteral,

  // patterns
  Argument,
  Arguments,

  // Root
  Program,
}
export const _ = "([\\s\\n]+)?";
export const __ = "\\s+";
export const SYMBOL = "([a-zA-Z_$][a-zA-Z0-9_$]*)";
export const PAIRED_CHARS = ["(", ")", "{", "}", "[", "]", "<", ">"] as const;

export const OPERATORS = [
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

export const RESERVED_WORDS = [
  "break",
  "const",
  "let",
  "if",
  "while",
  "do",
  "else",
  "default",
  "case",
  "debugger",
  "continue",
  "instanceof",
  "import",
  "in",
  "new",
  "return",
  "switch",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "delete",
  "export",
  "from",
  "of",
  "yield",
  "await",
  "async",
  "function",
  "get",
  "set",
  "static",
  "class",
  "extends",
  "super",
  "const",
  "enum",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  "implements",
  "with",
  "class",
  "super",
  "null",
  "true",
  "false",
  "this",
];
