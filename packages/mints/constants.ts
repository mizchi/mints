// import { debuggerStatement } from './statements';
export enum NodeTypes {
  // Root
  Program = 512,

  // Statements
  Block,
  BlockStatement,
  LabeledStatement,
  DebuggerStatement,
  ReturnStatement,
  yieldStatement,
  VariableStatement,
  ThrowStatement,
  BreakStatement,
  EmptyStatement,
  ExpressionStatement,
  NonEmptyStatement,
  AnyStatement,
  IfStatement,
  InterfaceStatement,
  DoWhileStatement,
  WhileStatement,
  ForStatement,
  ForItemStatement,
  SwitchStatement,
  ImportStatement,
  ExportStatement,
  DeclareVariableStatement,
  TypeStatement,
  // Expression
  Expression,
  AsExpression,
  ClassExpression,
  AnyExpression,
  Identifier,
  TernaryExpression,
  ParenExpression,
  LefthandSideExpression,
  CallExpression,
  MemberExpression,
  UnaryExpression,
  BinaryExpression,
  FunctionExpression,
  ArrowFunctionExpression,

  // Literal
  AnyLiteral,
  StringLiteral,
  RegExpLiteral,
  NumberLiteral,
  TemplateLiteral,
  BooleanLiteral,
  NullLiteral,
  ArrayLiteral,
  ObjectLiteral,

  // Type
  TypeExpression,
  TypeUnaryExpression,
  TypeBinaryExpression,
  TypeLiteral,
  TypeReference,
  TypeFunction,
  TypeAnnotation,
  TypeObjectLiteral,
  TypeArrayLiteral,
  TypeParameters,
  TypeDeclareParameters,
  TypeIdentifier,
  TypeFunctionExpression,
  // Patterns
  Argument,
  Arguments,
  DestructivePattern,
  DestructiveObjectPattern,
  DestructiveArrayPattern,
  ClassField,
}
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
