// import { TokenMap } from "./utils";

// ==== constants ====

export const nodeBaseDefault: Omit<RuleBase, "id" | "reshape" | "kind"> = {
  key: undefined,
  optional: false,
  skip: false,
};

export enum NodeKind {
  SEQ = 1,
  ATOM,
  REPEAT,
  TOKEN,
  REGEX,
  STRING,
  OR,
  REF,
  EOF,
  PAIR,
  NOT,
}

export enum ErrorType {
  Not_IncorrectMatch = 400,
  Pair_Unmatch,
  Eof_Unmatch,
  Token_Unmatch,
  Seq_Stop,
  Or_UnmatchAll,
  Repeat_RangeError,
  Atom_ParseError,
}

export const defaultReshape: Reshape<any, any> = <T>(i: T): T => i;

// basic parser rule

export type RuleBase = {
  id: number;
  kind: NodeKind;
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
  kind: NodeKind.ATOM;
  parse: InternalParser;
};

export type SerializedAtom = [
  kind: NodeKind.EOF,
  parsePtr: number,
  ...body: SerializedRuleBody
];

export type Eof = RuleBase & {
  kind: NodeKind.EOF;
};

// Atom can not serialize
export type SerializedEof = [kind: NodeKind.EOF, ...body: SerializedRuleBody];

export type Not = RuleBase & {
  kind: NodeKind.NOT;
  child: Rule;
};

export type SerializedNot = [
  kind: NodeKind.NOT,
  childPtr: number,
  ...body: SerializedRuleBody
];

export type Seq = RuleBase & {
  kind: NodeKind.SEQ;
  children: Rule[];
};

export type SerializedSeq = [
  kind: NodeKind.SEQ,
  childrenPtr: number,
  ...body: SerializedRuleBody
];

export type Ref = RuleBase & {
  kind: NodeKind.REF;
  ref: string;
};

export type SerializedRef = [
  kind: NodeKind.REF,
  ref: number,
  ...body: SerializedRuleBody
];

export type Repeat = RuleBase & {
  kind: NodeKind.REPEAT;
  pattern: Rule;
  min: number;
  max?: number | void;
};

export type SerializedRepeat = [
  kind: NodeKind.REPEAT,
  patternPtr: number,
  min: number,
  max: number,
  ...body: SerializedRuleBody
];

export type Or = RuleBase & {
  kind: NodeKind.OR;
  patterns: Array<Seq | Token | Ref | Regex>;
};

export type SerializedOr = [
  kind: NodeKind.OR,
  patternsPtr: number,
  ...body: SerializedRuleBody
];

export type Token = RuleBase & {
  kind: NodeKind.TOKEN;
  expr: string;
};

export type SerializedToken = [
  kind: NodeKind.TOKEN,
  exprPtr: string,
  ...body: SerializedRuleBody
];

export type Regex = RuleBase & {
  kind: NodeKind.REGEX;
  expr: string;
};

export type SerializedRegex = [
  kind: NodeKind.REGEX,
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

export type RootCompiler = (
  node: Rule | number,
  opts?: { end: boolean }
) => RootParser;

export type RootParser = (input: string, pos?: number) => ParseResult;

export type InputNodeExpr = Rule | string | number;

export type Builder = {
  close(): void;
  // def(refId: ID | symbol, node: InputNodeExpr, reshape?: Reshape): ID;
  def(node: () => InputNodeExpr, reshape?: Reshape): number;
  ref(refId: number, reshape?: Reshape): Ref;

  regex(expr: string, reshape?: Reshape): Regex;
  // regex tagged template
  r(strings: TemplateStringsArray, name?: string): Regex;

  tok(expr: string, reshape?: Reshape): Token;
  repeat(
    pattern: InputNodeExpr,
    minmax?: [min: number | void, max?: number | void],
    reshape?: Reshape
  ): Repeat;
  repeat_seq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
    minmax?: [min: number | void, max?: number | void],
    reshape?: Reshape
  ): Repeat;
  or: (
    patterns: Array<Seq | Token | Ref | Or | Eof | string | number | Regex>,
    reshape?: Reshape
  ) => Rule;
  seq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
    reshape?: Reshape
  ): Seq;
  // pair(pair: { open: string; close: string }, reshape?: Reshape): Rule;
  not(child: InputNodeExpr, reshape?: Reshape): Not;
  atom(fn: InternalParser): Atom;
  opt<T extends Rule = any>(node: InputNodeExpr): T;
  skip_opt<T extends Rule>(node: InputNodeExpr): T;
  param<T extends Rule>(key: string, node: InputNodeExpr, reshape?: Reshape): T;
  skip<T extends Rule>(node: T | string): T;
  join(...expr: string[]): Token;
  eof(): Eof;
  ["!"]: (child: InputNodeExpr) => Not;
  ["*"](
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>
  ): Repeat;
  ["+"](
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>
  ): Repeat;
};

// compiler internal

export type Compiler = {
  composeTokens: boolean;
  defs: DefsMap;
  // pairs: string[];
  rules: RulesMap<any>;
  compile: RootCompiler;
};

export type DefsMap = Record<string | number, InternalParser>;

export type RulesMap<T> = Record<
  any,
  (node: T, opts: Compiler) => InternalParser
>;

export type PackratCache = {
  export(): CacheMap;
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
  chars: string[];
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
  ranges: Array<Range>;
};

export type ParseErrorBase = {
  error: true;
  pos: number;
  errorType: ErrorType;
  kind: NodeKind;
  result?: any;
  detail?: any;
};

export type ParseError =
  | (ParseErrorBase & {
      errorType: ErrorType.Repeat_RangeError;
    })
  | (ParseErrorBase & {
      errorType: ErrorType.Not_IncorrectMatch;
    })
  | (ParseErrorBase & {
      errorType: ErrorType.Pair_Unmatch;
    })
  | (ParseErrorBase & {
      errorType: ErrorType.Eof_Unmatch;
    })
  | (ParseErrorBase & {
      errorType: ErrorType.Token_Unmatch;
      detail?: string;
    })
  | (ParseErrorBase & {
      errorType: ErrorType.Seq_Stop;
    })
  | (ParseErrorBase & {
      errorType: ErrorType.Atom_ParseError;
    })
  | (ParseErrorBase & {
      errorType: ErrorType.Or_UnmatchAll;
      detail: {
        children: Array<ParseError[]>;
      };
    });
