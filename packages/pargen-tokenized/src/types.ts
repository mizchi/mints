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

export type SerializedAtom = [
  kind: typeof RULE_EOF,
  id1: number,
  id2: number,
  parsePtr: number
];

export type Any<T = any> = {
  id: number;
  kind: typeof RULE_ANY;
  len: number;
  reshape?: (tokens: string[]) => T;
};

export type SerializedAny = [
  kind: typeof RULE_ANY,
  id: number,
  id2: number,
  len: number,
  reshapePtr: number
];

export type Eof = RuleBase & {
  kind: typeof RULE_EOF;
};
export type SerializedEof = [kind: typeof RULE_EOF, id1: number, id2: number];

export type Not = RuleBase & {
  kind: typeof RULE_NOT;
  patterns: Rule[];
};

export type SerializedNot = [
  kind: typeof RULE_NOT,
  id: number,
  id2: number,
  childPtr: number
];

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

export type SerializedSeq = [
  kind: typeof RULE_SEQ,
  id1: number,
  id2: number,
  childrenPtr: number,
  reshapePtr: number
];

export type SerializedSeqObject = [
  kind: typeof RULE_SEQ_OBJECT,
  id1: number,
  id2: number,
  childrenPtr: number,
  reshapePtr: number
];

export type Ref<T = any, U = any> = {
  id: number;
  kind: typeof RULE_REF;
  ref: number;
  reshape?: (results: T, ctx: ParseContext) => U;
};

export type SerializedRef = [
  kind: typeof RULE_REF,
  id1: number,
  id2: number,
  ref: number,
  reshapePtr: number
];

export type Repeat<T = string, U = T, R = U[]> = {
  id: number;
  kind: typeof RULE_REPEAT;
  pattern: Rule;
  // min: number;
  // max?: number | void;
  reshapeEach?: (results: T[], ctx: ParseContext) => U;
  reshape?: (results: U[], ctx: ParseContext) => R;
};

export type SerializedRepeat = [
  kind: typeof RULE_REPEAT,
  id1: number,
  id2: number,
  patternPtr: number,
  min: number,
  max: number,
  reshapeEachPtr: number,
  reshapePtr: number
];

export type Or = {
  id: number;
  kind: typeof RULE_OR;
  patterns: Array<Seq | Token | Ref | Regex>;
};

export type SerializedOr = [
  kind: typeof RULE_OR,
  id1: number,
  id2: number,
  patternsPtr: number
];

export type Token<T = string> = {
  id: number;
  kind: typeof RULE_TOKEN;
  expr: string;
  reshape?: (raw: string) => T;
};

export type SerializedToken = [
  kind: typeof RULE_TOKEN,
  id1: number,
  id2: number,
  exprPtr: number,
  reshapePtr: number
];

export type Regex<T = string> = {
  id: number;
  kind: typeof RULE_REGEX;
  expr: string | RegExp;
  reshape?: (raw: string) => T;
};

export type SerializedRegex = [
  kind: typeof RULE_REGEX,
  id1: number,
  id2: number,
  exprPtr: number,
  reshapePtr: number
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
  | SerializedRegex;

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
  pos?: number
) => ParseSuccess | (ParseError & { tokens: string[] });

export type InputNodeExpr = Rule | string | number;

export type DefinitionMap = Map<number, Rule>;

export type Compiler = {
  parsers: ParserMap;
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
