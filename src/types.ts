import { TokenMap } from "./utils";

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

export type RootCompiler<ID extends number> = (
  node: Rule | ID,
  opts?: { end: boolean }
) => RootParser;

export type RootParser = (input: string, ctx?: ParseContext) => ParseResult;

export type RuleDefinition<T, Args extends Array<any> = [T]> = {
  kind: any;
  compile: Parser<T>;
  builder?: (...args: Args) => T;
};

export type InputNodeExpr<RefId extends number | string = number> =
  | Rule<any>
  | string
  | RefId;

export type Builder<ID = number> = {
  def(refId: ID | symbol, node: InputNodeExpr, reshape?: Reshape): ID;
  ref(refId: ID, reshape?: Reshape): Ref;
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
    patterns: Array<Seq | Token | Ref | Or | Eof | string | ID>,
    reshape?: Reshape
  ) => Or;
  seq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
    reshape?: Reshape
  ): Seq;
  pair(pair: { open: string; close: string }, reshape?: Reshape): Rule;
  not(child: InputNodeExpr, reshape?: Reshape): Not;
  atom(fn: Parser): Atom;
  opt<T extends Rule>(node: InputNodeExpr): T;
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

export type Compiler<ID extends number> = {
  composeTokens: boolean;
  patterns: PatternsMap;
  pairs: string[];
  refs: any;
  rules: RulesMap<any>;
  compile: RootCompiler<ID>;
};

export type PatternsMap = Record<string | symbol, InternalPerser | void>;

export type RulesMap<T> = Record<
  any,
  (node: T, opts: Compiler<any>) => InternalPerser
>;

export type PackratCache = {
  export(): CacheMap;
  add(id: Rule["id"], pos: number, result: any): void;
  get(id: Rule["id"], pos: number): ParseResult | void;
};

// internal
export type CacheMap = { [key: `${number}@${string}`]: ParseSuccess };

// parser api

export type ParseContext = {
  cache: PackratCache;
  pos: number;
  tokenMap: TokenMap<string>;
};

export type Parser<T = any> = (
  node: T,
  opts: Compiler<any>
) => (
  input: string,
  ctx: ParseContext
) => number | [output: any, len: number] | void;

/* compild from rule parser with cache */
export type InternalPerser = (input: string, ctx: ParseContext) => ParseResult;
export type ParseResult = ParseSuccess | ParseError;

export type Reshape<In = any, Out = any> = (
  input: In,
  ctx?: ParseContext
) => Out;

export type ParseSuccess = {
  error: false;
  result: any;
  len: number;
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
  /* Skip self as sequence result */
  skip?: boolean;
  /* Reshape result */
  reshape?: Reshape;
};

export type NewRule<T extends object = {}> = T &
  RuleBase & {
    primitive: false;
  };

export type Rule<T extends object = {}> =
  | Seq
  | Token
  | Or
  | Repeat
  | Ref
  | Eof
  | Not
  | Atom
  | NewRule<T>;

export type PrimitiveRule = RuleBase & {
  primitive: true;
};

export type Atom = PrimitiveRule & {
  kind: NodeKind.ATOM;
  parse: Parser;
};

export type Eof = PrimitiveRule & {
  kind: NodeKind.EOF;
};

export type Not = PrimitiveRule & {
  kind: NodeKind.NOT;
  child: Rule<any>;
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
