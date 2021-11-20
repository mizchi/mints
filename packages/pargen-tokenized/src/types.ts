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
  t: number;
};

export type Atom = {
  t: typeof RULE_ATOM;
  c: number;
};

export type Any<T = any> = {
  t: typeof RULE_ANY;
  c: number;
  r: number;
};

export type Eof = {
  t: typeof RULE_EOF;
};

export type Not = {
  t: typeof RULE_NOT;
  c: Rule[] | number[];
};

export type Flags = {
  opt?: boolean;
  skip?: boolean;
  push?: boolean;
  key?: string;
  pop?: number;
};

export type Seq<T = string, U = string> = {
  t: typeof RULE_SEQ;
  c: Rule[] | number[];
  f: (Flags | null)[];
  r: number;
};

export type SeqObject<T = any, U = any> = {
  t: typeof RULE_SEQ_OBJECT;
  c: Rule[] | number[];
  f: (Flags | null)[];
  r: number;
};

export type Ref<T = any, U = any> = {
  t: typeof RULE_REF;
  c: number;
  r: number;
};

export type Repeat<T = string, U = T, R = U[]> = {
  t: typeof RULE_REPEAT;
  c: Rule | number;
  e: number;
  r: number;
};

export type Or = {
  t: typeof RULE_OR;
  c: Array<Seq | Token | Ref | Regex> | number[];
};

export type Token<T = string> = {
  t: typeof RULE_TOKEN;
  c: string;
  r: number;
};

export type Regex = {
  t: typeof RULE_REGEX;
  c: string;
  r: number;
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
// export type RootCompilerOptions = {
//   end?: boolean;
// };
export type RootCompiler = (node: Rule | number) => RootParser;

export type RootParser = (
  tokens: string[],
  pos?: number,
  entryRef?: number
) => ParseSuccess | (ParseError & { tokens: string[] });

export type RuleExpr = Rule | string | number;

export type Snapshot = [
  entryRefId: number,
  rules: Array<Rule["t"]>,
  values: Array<number>,
  refs: number[],
  cidsList: Array<number[]>,
  reshapes: { [key: number]: number },
  reshapeEachs: { [key: number]: number },
  flagsList: { [key: number]: number[] },
  keyList: { [key: number]: number[] },
  popList: { [key: number]: number[] },
  strings: string[]
];

export type ParseContext = Snapshot & {
  t: string[];
  funcs: Function[];
  cache: Map<string, ParseResult>;
  currentError: ParseError | null;
};

export type InternalParser = (ctx: ParseContext, pos: number) => ParseResult;
export type ParseResult = ParseSuccess | ParseError;

export type ParseSuccess = {
  error: false;
  pos: number;
  len: number;
  xs: Array<number | any>;
};

// Parse Errors
type RepeatRangeError = [code: typeof CODE_REPEAT_RANGE];

type NotIncorrectMatch = [
  code: typeof CODE_NOT_INCORRECT_MATCH,
  matched: ParseSuccess
];

type EofUnmatch = [code: typeof CODE_EOF_UNMATCH];

type TokenUnmatch = [
  code: typeof CODE_TOKEN_UNMATCH,
  expect: string,
  got: string
];

type RegexUnmatch = [
  code: typeof CODE_REGEX_UNMATCH,
  expect: string,
  got: string
];

type SeqStop = [
  code: typeof CODE_SEQ_STOP,
  index: number,
  childError: ParseError
];

type SeqNoStack = [code: typeof CODE_SEQ_NO_STACK_ON_POP, index: number];
type SeqStackLeft = [code: typeof CODE_SEQ_STACK_LEFT];

type SeqUnmatchStack = [code: typeof CODE_SEQ_UNMATCH_STACK, index: number];

type UnmatchAll = [code: typeof CODE_OR_UNMATCH_ALL, errors: Array<ParseError>];

type AtomError = [code: typeof CODE_ATOM_PARSE_ERROR, childError: ParseError];

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

export type ParseError = {
  error: true;
  pos: number;
  detail: ParseErrorData;
};
