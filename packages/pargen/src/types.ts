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
  STRING,
  OR,
  REF,
  EOF,
  PAIR,
  NOT,
  RECURSION,
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

// ==== public interface

export type RootCompiler = (
  node: Rule | number,
  opts?: { end: boolean }
) => RootParser;

export type RootParser = (input: string, ctx?: ParseContext) => ParseResult;

export type InputNodeExpr = Rule | string | number;

export type Builder = {
  close(): void;
  // def(refId: ID | symbol, node: InputNodeExpr, reshape?: Reshape): ID;
  def(node: () => InputNodeExpr, reshape?: Reshape): number;
  ref(refId: number, reshape?: Reshape): Ref;
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
    patterns: Array<Seq | Token | Ref | Or | Eof | string | number>,
    reshape?: Reshape
  ) => Rule;
  seq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
    reshape?: Reshape
  ): Seq;
  // pair(pair: { open: string; close: string }, reshape?: Reshape): Rule;
  not(child: InputNodeExpr, reshape?: Reshape): Not;
  atom(fn: Parser): Atom;
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

export type DefsMap = Record<string | symbol, InternalPerser | void>;

export type RulesMap<T> = Record<
  any,
  (node: T, opts: Compiler) => InternalPerser
>;

export type PackratCache = {
  export(): CacheMap;
  add(id: number | string, pos: number, result: any): void;
  get(id: number | string, pos: number): ParseResult | void;
};

// internal
export type CacheMap = { [key: `${number}@${string}`]: ParseSuccess };

export type ParseContext = {
  raw: string;
  chars: string[];
  cache: PackratCache;
  pos: number;
};

export type Parser<T = any> = (
  node: T,
  opts: Compiler
) => (ctx: ParseContext) => number | [output: any, len: number] | void;

export type InternalPerser = (ctx: ParseContext) => ParseResult;
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

// ==== rules ====

// old rules
export type RuleBase = {
  id: string;
  kind: NodeKind;
  key?: string | void;
  optional?: boolean;
  skip?: boolean;
  reshape?: Reshape;
};

export type Rule = Seq | Token | Or | Repeat | Ref | Eof | Not | Atom;

export type PrimitiveRule = RuleBase;

export type Atom = PrimitiveRule & {
  kind: NodeKind.ATOM;
  parse: Parser;
};

export type Eof = PrimitiveRule & {
  kind: NodeKind.EOF;
};

export type Not = PrimitiveRule & {
  kind: NodeKind.NOT;
  child: Rule;
};

export type Seq = PrimitiveRule & {
  kind: NodeKind.SEQ;
  children: Rule[];
};

export type Ref = PrimitiveRule & {
  kind: NodeKind.REF;
  ref: string;
};

export type Repeat = PrimitiveRule & {
  kind: NodeKind.REPEAT;
  pattern: Rule;
  min: number;
  max?: number | void;
};

export type Or = PrimitiveRule & {
  kind: NodeKind.OR;
  patterns: Array<Seq | Token | Ref>;
};

export type Token = PrimitiveRule & {
  kind: NodeKind.TOKEN;
  expr: string;
};
