import type {
  RULE_ANY,
  RULE_ATOM,
  RULE_NOT,
  RULE_OR,
  RULE_REF,
  RULE_REGEX,
  RULE_REPEAT,
  RULE_SEQ,
  RULE_SEQ_OBJECT,
  RULE_TOKEN,
  RULE_EOF,
  CODE_EOF_UNMATCH,
  CODE_NOT_INCORRECT_MATCH,
  CODE_ATOM_PARSE_ERROR,
  CODE_OR_UNMATCH_ALL,
  CODE_REGEX_UNMATCH,
  CODE_REPEAT_RANGE,
  CODE_SEQ_NO_STACK_ON_POP,
  CODE_SEQ_STACK_LEFT,
  CODE_SEQ_STOP,
  CODE_SEQ_UNMATCH_STACK,
  CODE_TOKEN_UNMATCH,
} from "./constants";

export type RuleBase = {
  u: number;
  t: number;
};

export type Atom = {
  u: number;
  t: typeof RULE_ATOM;
  c: InternalParser;
};

export type Any<T = any> = {
  u: number;
  t: typeof RULE_ANY;
  c: number;
  r?: (tokens: string[]) => T;
};

export type Eof = {
  u: number;
  t: typeof RULE_EOF;
};

export type Not = {
  u: number;
  t: typeof RULE_NOT;
  c: Rule[] | number[];
};

export type Flags = {
  opt?: boolean;
  skip?: boolean;
  push?: boolean;
  key?: string;
  pop?: (
    a: ParseSuccess["results"],
    b: ParseSuccess["results"],
    ctx: ParseContext
  ) => boolean;
};

export type Seq<T = string, U = string> = {
  u: number;
  t: typeof RULE_SEQ;
  c: Rule[] | number[];
  f: (Flags | null)[];
  r?: (results: T[], ctx: ParseContext) => U;
};

export type SeqObject<T = any, U = any> = {
  u: number;
  t: typeof RULE_SEQ_OBJECT;
  c: Rule[] | number[];
  f: (Flags | null)[];
  r?: (results: T, ctx: ParseContext) => U;
};

export type Ref<T = any, U = any> = {
  u: number;
  t: typeof RULE_REF;
  c: number;
  r?: (results: T, ctx: ParseContext) => U;
};

export type Repeat<T = string, U = T, R = U[]> = {
  u: number;
  t: typeof RULE_REPEAT;
  c: Rule | number;
  e?: (results: T[], ctx: ParseContext) => U;
  r?: (results: U[], ctx: ParseContext) => R;
};

export type Or = {
  u: number;
  t: typeof RULE_OR;
  c: Array<Seq | Token | Ref | Regex> | number[];
};

export type Token<T = string> = {
  u: number;
  t: typeof RULE_TOKEN;
  c: string;
  r?: (raw: string) => T;
};

export type Regex<T = string> = {
  u: number;
  t: typeof RULE_REGEX;
  c: string | RegExp;
  r?: (raw: string) => T;
};

export type Rule =
  | Seq
  | SeqObject
  | Token
  | Or
  | Repeat
  | Ref
  | Eof
  | Not
  | Atom
  | Regex
  | Any;

// ==== public interface
export type RootCompilerOptions = {
  end?: boolean;
};
export type RootCompiler = (
  node: Rule | number,
  opts?: RootCompilerOptions
) => RootParser;

export type RootParser = (
  tokens: string[],
  pos?: number,
  entryRef?: number
) => ParseSuccess | (ParseError & { tokens: string[] });

export type RuleExpr = Rule | string | number;

export type DefinitionMap = Map<number, Rule>;

export type Compiler = {
  refs: number[];
  rules: Rule[];
};

export type ParserMap = Map<number, InternalParser>;

export type ParseContext = {
  tokens: string[];
  cache: Map<string, ParseResult>;
  currentError: ParseError | null;

  refs: number[]; // ref index to rule index
  rules: Rule[];
  parsers: InternalParser[];
};

export type InternalParser = (ctx: ParseContext, pos: number) => ParseResult;
export type ParseResult = ParseSuccess | ParseError;

export type Reshape<In = any, Out = any> = (
  input: In,
  ctx?: ParseContext
) => Out;

export type ParseSuccess = {
  error: false;
  pos: number;
  len: number;
  results: Array<number | any>;
};

// Parse Errors
type RepeatRangeError = {
  code: typeof CODE_REPEAT_RANGE;
};

type NotIncorrectMatch = {
  code: typeof CODE_NOT_INCORRECT_MATCH;
  matched: ParseSuccess;
};

type EofUnmatch = {
  code: typeof CODE_EOF_UNMATCH;
};

type TokenUnmatch = {
  code: typeof CODE_TOKEN_UNMATCH;
  expect: string;
  got: string;
};

type RegexUnmatch = {
  code: typeof CODE_REGEX_UNMATCH;
  expect: string;
  got: string;
};

type SeqStop = {
  code: typeof CODE_SEQ_STOP;
  index: number;
  childError: ParseError;
};

type SeqNoStack = {
  code: typeof CODE_SEQ_NO_STACK_ON_POP;
  index: number;
};
type SeqStackLeft = {
  code: typeof CODE_SEQ_STACK_LEFT;
};

type SeqUnmatchStack = {
  code: typeof CODE_SEQ_UNMATCH_STACK;
  index: number;
};

type UnmatchAll = {
  code: typeof CODE_OR_UNMATCH_ALL;
  errors: Array<ParseError>;
};

type AtomError = {
  code: typeof CODE_ATOM_PARSE_ERROR;
  childError: ParseError;
};

export type ParseErrorData =
  | RepeatRangeError
  | NotIncorrectMatch
  | EofUnmatch
  | TokenUnmatch
  | RegexUnmatch
  | SeqStop
  | SeqUnmatchStack
  | SeqNoStack
  | SeqStackLeft
  | AtomError
  | UnmatchAll;

export type ParseErrorBase = {
  error: true;
  pos: number;
};

export type ParseError = ParseErrorData & ParseErrorBase;
