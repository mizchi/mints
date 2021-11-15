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
  id: number;
  kind: number;
};

export type Atom = {
  id: number;
  kind: typeof RULE_ATOM;
  parse: InternalParser;
};

export type Any<T = any> = {
  id: number;
  kind: typeof RULE_ANY;
  len: number;
  reshape?: (tokens: string[]) => T;
};

export type Eof = RuleBase & {
  kind: typeof RULE_EOF;
};

export type Not = RuleBase & {
  kind: typeof RULE_NOT;
  patterns: Rule[];
};

export type SeqChildParams = {
  key?: string;
  opt?: boolean;
  skip?: boolean;
  push?: boolean;
  pop?: (
    a: ParseSuccess["results"],
    b: ParseSuccess["results"],
    ctx: ParseContext
  ) => boolean;
};

export type SeqChildRule = RuleBase & SeqChildParams;

export type Seq<T = string, U = string> = {
  kind: typeof RULE_SEQ;
  id: number;
  children: SeqChildRule[];
  reshape?: (results: T[], ctx: ParseContext) => U;
};

export type SeqObject<T = any, U = any> = {
  kind: typeof RULE_SEQ_OBJECT;
  id: number;
  children: SeqChildRule[];
  reshape?: (results: T, ctx: ParseContext) => U;
};

export type Ref<T = any, U = any> = {
  id: number;
  kind: typeof RULE_REF;
  ref: number;
  reshape?: (results: T, ctx: ParseContext) => U;
};

export type Repeat<T = string, U = T, R = U[]> = {
  kind: typeof RULE_REPEAT;
  id: number;
  pattern: Rule;
  reshapeEach?: (results: T[], ctx: ParseContext) => U;
  reshape?: (results: U[], ctx: ParseContext) => R;
};

export type Or = {
  id: number;
  kind: typeof RULE_OR;
  patterns: Array<Seq | Token | Ref | Regex>;
};

export type Token<T = string> = {
  id: number;
  kind: typeof RULE_TOKEN;
  expr: string;
  reshape?: (raw: string) => T;
};

export type Regex<T = string> = {
  id: number;
  kind: typeof RULE_REGEX;
  expr: string | RegExp;
  reshape?: (raw: string) => T;
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

export type u8 = number;

// 0
export type SerializedEof = [];
// 1 byte
export type SerializedAtom = [funcPtr: u8];
export type SerializedAny = [len: u8];
export type SerializedToken = [stringPtr: u8];
export type SerializedRegex = [stringPtr: u8];
export type SerializedRef = [ref: u8];

// 2 bytes
export type SerializedNot = [childrenPtr1: u8];
export type SerializedSeq = [childrenPtr1: u8];
export type SerializedSeqObject = [childrenPtr1: u8];
export type SerializedOr = [childPtr1: u8];

// 3 bytes
export type SerializedRepeat = [
  patternPtr1: u8,
  patternPtr2: u8,
  reshapeEachPtr: u8
];

export type SerializedRule =
  | SerializedSeq
  | SerializedToken
  | SerializedOr
  | SerializedRepeat
  | SerializedRef
  | SerializedEof
  | SerializedNot
  | SerializedAtom
  | SerializedAny
  | SerializedAtom
  | SerializedSeqObject
  | SerializedRegex;

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
  pos?: number
) => ParseSuccess | (ParseError & { tokens: string[] });

export type InputNodeExpr = Rule | string | number;

export type DefinitionMap = Map<number, Rule>;

export type Compiler = {
  parsers: InternalParser[];
  definitions: DefinitionMap;
  data: any;
};

export type ParserMap = Map<number, InternalParser>;
export type ParseContext = {
  root: number | string;
  tokens: string[];
  cache: Map<string, ParseResult>;
  currentError: ParseError | null;
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
  rootId: number;
  pos: number;
};

export type ParseError = ParseErrorData & ParseErrorBase;
