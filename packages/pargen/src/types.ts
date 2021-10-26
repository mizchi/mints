// import { TokenMap } from "./utils";

// ==== constants ====

export const nodeBaseDefault: Omit<RuleBase, "id" | "reshape" | "kind"> = {
  key: undefined,
  optional: false,
  skip: false,
};

export const SEQ = 1;
export const ATOM = 2;
export const REPEAT = 3;
export const TOKEN = 4;
export const REGEX = 5;
export const STRING = 6;
export const OR = 7;
export const REF = 8;
export const EOF = 9;
export const PAIR = 10;
export const NOT = 11;

export const ERROR_Not_IncorrectMatch = 400;
export const ERROR_Pair_Unmatch = 401;
export const ERROR_Eof_Unmatch = 402;
export const ERROR_Token_Unmatch = 403;
export const ERROR_Regex_Unmatch = 404;
export const ERROR_Seq_Stop = 405;
export const ERROR_Or_UnmatchAll = 406;
export const ERROR_Repeat_RangeError = 407;
export const ERROR_Atom_ParseError = 408;

export const defaultReshape: Reshape<any, any> = <T>(i: T): T => i;

// basic parser rule

export type RuleBase = {
  id: number;
  // kind: NodeKind;
  key?: string | void;
  optional?: boolean;
  skip?: boolean;
  reshape?: Reshape;
};

export type SerializedRuleBody = [
  id: number,
  flags: number,
  keyPtr: number,
  reshapePtr: number
];

export type Atom = RuleBase & {
  kind: typeof ATOM;
  parse: InternalParser;
};

export type SerializedAtom = [
  kind: typeof EOF,
  parsePtr: number,
  ...body: SerializedRuleBody
];

export type Eof = RuleBase & {
  kind: typeof EOF;
};

// Atom can not serialize
export type SerializedEof = [kind: typeof EOF, ...body: SerializedRuleBody];

export type Not = RuleBase & {
  kind: typeof NOT;
  child: Rule;
};

export type SerializedNot = [
  kind: typeof NOT,
  childPtr: number,
  ...body: SerializedRuleBody
];

export type Seq = RuleBase & {
  kind: typeof SEQ;
  children: Rule[];
};

export type SerializedSeq = [
  kind: typeof SEQ,
  childrenPtr: number,
  ...body: SerializedRuleBody
];

export type Ref = RuleBase & {
  kind: typeof REF;
  ref: number;
};

export type SerializedRef = [
  kind: typeof REF,
  ref: number,
  ...body: SerializedRuleBody
];

export type Repeat = RuleBase & {
  kind: typeof REPEAT;
  pattern: Rule;
  min: number;
  max?: number | void;
};

export type SerializedRepeat = [
  kind: typeof REPEAT,
  patternPtr: number,
  min: number,
  max: number,
  ...body: SerializedRuleBody
];

export type Or = RuleBase & {
  kind: typeof OR;
  patterns: Array<Seq | Token | Ref | Regex>;
};

export type SerializedOr = [
  kind: typeof OR,
  patternsPtr: number,
  ...body: SerializedRuleBody
];

export type Token = RuleBase & {
  kind: typeof TOKEN;
  expr: string;
};

export type SerializedToken = [
  kind: typeof TOKEN,
  exprPtr: string,
  ...body: SerializedRuleBody
];

export type Regex = RuleBase & {
  kind: typeof REGEX;
  expr: string;
};

export type SerializedRegex = [
  kind: typeof REGEX,
  exprPtr: number,
  ...body: SerializedRuleBody
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
  | SerializedRegex;

export type Rule = Seq | Token | Or | Repeat | Ref | Eof | Not | Atom | Regex;

// ==== public interface

export type RootCompilerOptions = {
  end?: boolean;
};
export type RootCompiler = (
  node: Rule | number,
  opts?: RootCompilerOptions
) => RootParser;

export type RootParser = (input: string, pos?: number) => ParseResult;

export type InputNodeExpr = Rule | string | number;

export type DefinitionMap = Map<number, Rule>;

export type Compiler = {
  parsers: ParserMap;
  definitions: DefinitionMap;
};

export type ParserMap = Map<number, InternalParser>;
export type PackratCache = {
  add(id: number | string, pos: number, result: any): void;
  get(id: number | string, pos: number): ParseResult | void;
  getOrCreate(
    id: number | string,
    pos: number,
    creator: () => ParseResult
  ): ParseResult;
};

// internal
export type CacheMap = { [key: `${number}@${string}`]: ParseSuccess };

export type ParseContext = {
  root: number | string;
  raw: string;
  // chars: string[];
  cache: PackratCache;
};

export type InternalParser = (ctx: ParseContext, pos: number) => ParseResult;
export type ParseResult = ParseSuccess | ParseError;

export type Reshape<In = any, Out = any> = (
  input: In,
  ctx?: ParseContext
) => Out;

export type Range = [start: number, end: number];
export type ParseSuccess = {
  error: false;
  result: any;
  pos: number;
  len: number;
  ranges: Array<Range | string>;
  reshaped: boolean;
};

type RepeatRangeError = {
  errorType: typeof ERROR_Repeat_RangeError;
};

type NotIncorrectMatch = {
  errorType: typeof ERROR_Not_IncorrectMatch;
};

type EofUnmatch = {
  errorType: typeof ERROR_Eof_Unmatch;
};

type TokenUnmatch = {
  errorType: typeof ERROR_Token_Unmatch;
};

type RegexUnmatch = {
  errorType: typeof ERROR_Regex_Unmatch;
};

type SeqStop = {
  errorType: typeof ERROR_Seq_Stop;
  index: number;
  childError: ParseError;
};

type UnmatchAll = {
  errorType: typeof ERROR_Or_UnmatchAll;
  errors: Array<ParseError>;
};

type AtomError = {
  errorType: typeof ERROR_Atom_ParseError;
  childError: ParseError;
};

export type ParseErrorData =
  | RepeatRangeError
  | NotIncorrectMatch
  | EofUnmatch
  | TokenUnmatch
  | RegexUnmatch
  | SeqStop
  | AtomError
  | UnmatchAll;

export type ParseErrorBase = {
  error: true;
  rootId: number;
  pos: number;
};

export type ParseError = ParseErrorData & ParseErrorBase;
