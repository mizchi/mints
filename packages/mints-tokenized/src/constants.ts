// export const _ = "[\\s\\n]*";
export const _ = "([\\s\\n]+)?";
export const __ = `[\\s\\n]+`;

export const K_QUESTION = "?";
export const K_BANG = "!";
export const K_CASE = "case";
export const K_TRY = "try";

export const K_CONSTRUCTOR = "constructor";
export const K_FROM = "from";
export const K_STATIC = "static";
export const K_CLASS = "class";
export const K_CONTINUE = "continue";
export const K_TRUE = "true";
export const K_FALSE = "false";
export const K_FOR = "for";
export const K_IF = "if";
export const K_ELSE = "else";
export const K_AS = "as";
export const K_DEFAULT = "default";
export const K_EXPORT = "export";
export const K_FUNCTION = "function";
export const K_PRIVATE = "private";
export const K_PUBLIC = "public";
export const K_PROTECTED = "protected";
export const K_ASYNC = "async";
export const K_NULL = "null";
export const K_NEW = "new";
export const K_EXTENDS = "extends";
export const K_VOID = "void";
export const K_ABSTRACT = "abstract";
export const K_IMPLEMENTS = "implements";
export const K_IMPORT = "import";
export const K_THIS = "this";
export const K_READONLY = "readonly";
export const K_AWAIT = "await";
export const K_TYPEOF = "typeof";
export const K_DELETE = "delete";
export const K_BREAK = "break";
export const K_DEBUGGER = "debugger";
export const K_THROW = "throw";
export const K_RETURN = "return";
export const K_YIELD = "yield";
export const K_DO = "do";
export const K_WHILE = "while";
export const K_FINALLY = "finally";
export const K_VAR = "var";
export const K_CONST = "const";
export const K_LET = "let";
export const K_INTERFACE = "interface";
export const K_TYPE = "type";
export const K_DECLARE = "declare";
export const K_GET = "get";
export const K_SET = "set";
export const K_SWITCH = "switch";
export const K_INSTANCEOF = "instanceof";
export const K_CATCH = "catch";
export const K_IN = "in";
export const K_ENUM = "enum";
export const K_WITH = "with";

export const K_PAREN_OPEN = "(";
export const K_PAREN_CLOSE = ")";
export const K_BLACE_OPEN = "{";
export const K_BLACE_CLOSE = "}";

// "(?!.*@N).*?"
// export const PAIRED_CHARS = ["(", ")", "{", "}", "[", "]", "<", ">"] as const;
export const REST_SPREAD = "...";
export const SPACE_REQUIRED_OPERATORS = [K_INSTANCEOF, K_IN];

const SINGLE_OPERATORS = [
  "+",
  "-",
  "|",
  "&",
  "*",
  "/",
  ">",
  "<",
  "^",
  "%",
  "=",
];

export const OPERATORS = [
  // relation
  // "instanceof",
  // "in",

  // 3 chars
  ">>>",
  "===",
  "!==",

  // 2 chars
  "||",
  "&&",
  "**",
  ">=",
  "<=",
  "==",
  "!=",
  "<<",
  ">>",

  "+=",
  "-=",
  "*=",
  "|=",
  "/=",
  "??",

  // 1 chars
  ...SINGLE_OPERATORS,
] as const;

const KEYWORDS = [
  K_BREAK,
  K_DO,
  K_INSTANCEOF,
  K_TYPEOF,
  K_CASE,
  K_ELSE,
  K_NEW,
  K_VAR,
  K_CATCH,
  K_FINALLY,
  K_RETURN,
  K_VOID,
  K_CONTINUE,
  K_FOR,
  K_SWITCH,
  K_WHILE,
  K_DEBUGGER,
  K_FUNCTION,
  K_THIS,
  "with",
  K_DEFAULT,
  K_IF,
  K_THROW,
  K_DELETE,
  K_IN,
  K_TRY,
  // Future reserved words
  K_CLASS,
  K_ENUM,
  K_EXTENDS,
  "super",
  K_CONST,
  K_EXPORT,
  K_IMPORT,
  K_IMPLEMENTS,
  K_LET,
  K_PRIVATE,
  K_PUBLIC,
  K_YIELD,
  K_INTERFACE,
  K_PROTECTED,
  "package",
  K_STATIC,
] as const;

export const LITERAL_KEYWORDS = [K_NULL, K_TRUE, K_FALSE] as const;

export const RESERVED_WORDS = [...KEYWORDS, ...LITERAL_KEYWORDS] as const;
