import {
  buildTokenMap,
  findPatternAt,
  readPairedBlock,
  TokenMap,
} from "./utils";

// ==== constants ====
export enum NodeKind {
  SEQ = 1,
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
  Not_IncorrectMatch,
  Pair_Unmatch,
  Eof_Unmatch,
  Token_Unmatch,
  Seq_Stop,
  Or_UnmatchAll,
  Repeat_RangeError,
}

const nodeBaseDefault: Omit<NodeBase, "id" | "reshape" | "kind"> = {
  key: undefined,
  optional: false,
  skip: false,
};

// ==== types ====

export type Node =
  | Seq
  | Token
  | Or
  | Repeat
  | Ref
  | Eof
  | Pair
  | Not
  | Recursion;
type NodeBase = {
  id: string;
  kind: NodeKind;
  key?: string | void;
  optional?: boolean;
  /* Skip self as sequence result */
  skip?: boolean;
  /* Reshape result */
  reshape?: Parser;
};

export type Recursion = NodeBase & {
  kind: NodeKind.RECURSION;
};

export type Eof = NodeBase & {
  kind: NodeKind.EOF;
};

export type Pair = NodeBase & {
  kind: NodeKind.PAIR;
  open: string;
  close: string;
};

export type Not = NodeBase & {
  kind: NodeKind.NOT;
  child: Node;
};

export type Seq = NodeBase & {
  kind: NodeKind.SEQ;
  children: Node[];
};

export type Ref = NodeBase & {
  kind: NodeKind.REF;
  ref: string;
};

export type Repeat = NodeBase & {
  kind: NodeKind.REPEAT;
  pattern: Node;
  min: number;
  max?: number | void;
};

export type Or = NodeBase & {
  kind: NodeKind.OR;
  patterns: Array<Seq | Token | Ref>;
};

export type Token = NodeBase & {
  kind: NodeKind.TOKEN;
  expr: string;
};

type Cache = { [key: `${number}@${string}`]: ParseSuccess };
type PackratCache = {
  export(): Cache;
  add(id: Node["id"], pos: number, result: any): void;
  get(id: Node["id"], pos: number): ParseResult | void;
};

type InputNodeExpr<RefId extends number | string = number> =
  | Node
  | string
  | RefId;

type ParseSuccess = {
  error: false;
  result: any;
  len: number;
};

type ParseErrorBase = {
  error: true;
  pos: number;
  errorType: ErrorType;
  result?: any;
  detail?: any;
};

type ParseError =
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
      errorType: ErrorType.Or_UnmatchAll;
      detail: {
        children: Array<ParseError[]>;
      };
    });

type ParseResult = ParseSuccess | ParseError;

type RecParser = (input: string, ctx: ParseContext) => ParseResult;

type ParseContext = {
  cache: PackratCache;
  pos: number;
  tokenMap: TokenMap<string>;
};

export type Parser<In = any, Out = any> = (
  input: In,
  ctx?: ParseContext
) => Out;

type RootParser = (input: string, ctx?: ParseContext) => ParseResult;

export type Builder<ID = number> = {
  def(refId: ID | symbol, node: InputNodeExpr, reshape?: Parser): ID;
  ref(refId: ID, reshape?: Parser): Ref;
  tok(expr: string, reshape?: Parser): Token;
  R: Recursion;
  repeat(
    pattern: InputNodeExpr,
    minmax?: [min: number | void, max?: number | void],
    reshape?: Parser
  ): Repeat;
  repeat_seq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,

    minmax?: [min: number | void, max?: number | void],
    reshape?: Parser
  ): Repeat;

  or: (
    patterns: Array<Seq | Token | Ref | Or | Eof | string | ID | Recursion>,
    reshape?: Parser
  ) => Or;
  seq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
    reshape?: Parser
  ): Seq;
  pair(pair: [open: string, close: string], reshape?: Parser): Pair;
  not(child: InputNodeExpr, reshape?: Parser): Not;
  opt<T extends Node>(node: InputNodeExpr): T;
  param<T extends Node>(key: string, node: InputNodeExpr, reshape?: Parser): T;
  skip<T extends Node>(node: T | string): T;
  join(...expr: string[]): Token;
  eof(): Eof;
};
// impl
function createPackratCache(): PackratCache {
  const cache: Cache = {};
  const keygen = (id: Node["id"], pos: number): `${number}@${string}` =>
    `${pos}@${id}`;
  return {
    export(): Cache {
      return cache;
    },
    add(id: Node["id"], pos: number, result: ParseResult) {
      // @ts-ignore
      cache[keygen(id, pos)] = result;
    },
    get(id: Node["id"], pos: number): ParseResult | void {
      const key = keygen(id, pos);
      return cache[key];
    },
  };
}

// type SymbolMap = { [key: string | Symbol]: RecParser | void };
type SymbolMap = Record<string | symbol, RecParser | void>;

// type RefMap<ID extends number> = Record<ID, string>;

export function createContext<
  ID extends number = number,
  RefMap extends {} = {}
>({
  composeTokens = true,
  refs = {} as RefMap,
}: {
  composeTokens?: boolean;
  refs?: RefMap;
} = {}) {
  const symbolMap: SymbolMap = {};
  const refSet = new Set(Object.values(refs)) as Set<ID | Symbol>;
  const toNode = (input: InputNodeExpr): Node => {
    if (typeof input === "object") {
      return input;
    }
    if (typeof input === "number") {
      if (!refSet.has(input as ID)) {
        throw new Error(
          `[pargen:convert-expr-to-node] Ref ${
            (refs as any)[input]
          }:${input} not found`
        );
      }
      return createRef(input);
    }
    return typeof input === "string" ? createToken(input) : input;
  };
  let cnt = 0;
  const genId = () => (cnt++).toString();
  const exprCache: { [key: string]: Token } = {};

  function compile(
    node: Node | ID,
    {
      pairs = [],
      contextRoot = Symbol(),
    }: { pairs?: string[]; contextRoot?: symbol | ID } = {}
  ): RootParser {
    const realNode = toNode(node);
    const parse = compileRec(realNode, {
      symbolMap: symbolMap,
      root: realNode.id,
      contextRoot,
    });
    return (input: string, ctx: Partial<ParseContext> = {}) => {
      const cache = createPackratCache();
      const tokenMap = buildTokenMap(input, pairs);
      return parse(input, {
        cache: cache,
        pos: 0,
        tokenMap,
        ...ctx,
      });
    };
  }

  function defineSymbol<T extends ID | Symbol>(
    refId: T | symbol,
    node: InputNodeExpr,
    reshape?: Parser
  ): T {
    const id = refId;
    if (typeof id === "symbol") {
      refSet.add(id);
    }
    if (symbolMap[id as any]) {
      throw new Error(`Symbol:${id.toString()} is already defined`);
    }
    symbolMap[id as any] = () => {
      throw new Error("Override me");
    };
    const parser = compile(toNode(node), { contextRoot: id as any });
    symbolMap[id as any] = parser as any;
    // return createRef(id.toString(), reshape);
    return id as any;
  }

  function createRef(refId: string | number, reshape?: Parser): Ref {
    return {
      ...nodeBaseDefault,
      id: "symbol:" + genId(),
      kind: NodeKind.REF,
      ref: refId.toString(),
      reshape,
    } as Ref;
  }
  function createPair(
    pair: [open: string, close: string],
    reshape?: Parser
  ): Pair {
    return {
      ...nodeBaseDefault,
      id: "symbol:" + genId(),
      kind: NodeKind.PAIR,
      open: pair[0],
      close: pair[1],
      reshape,
    } as Pair;
  }

  function createSeq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
    reshape?: Parser
  ): Seq {
    let nodes: Node[] = [];

    if (composeTokens) {
      // compose token
      let currentTokens: string[] = [];
      children.forEach((child) => {
        if (typeof child === "string") {
          currentTokens.push(child);
        } else if (
          // plane expr
          typeof child !== "number" &&
          !Array.isArray(child) &&
          !child.skip &&
          child.kind === NodeKind.TOKEN &&
          child.reshape === defaultReshape &&
          child.key == null
        ) {
          currentTokens.push(child.expr);
        } else {
          // compose queued expr list to one expr
          if (currentTokens.length > 0) {
            nodes.push(createToken(currentTokens.join("")));
            currentTokens = [];
          }
          if (Array.isArray(child)) {
            const [key, ex] = child;
            nodes.push(param(key, toNode(ex)));
          } else {
            // raw expr
            nodes.push(toNode(child));
          }
        }
      });
      nodes.push(createToken(currentTokens.join("")));
    } else {
      // do not compose for debug
      nodes = children.map((child): Node => {
        if (Array.isArray(child)) {
          const [key, ex] = child;
          return param(key, toNode(ex));
        } else {
          return toNode(child);
        }
      });
    }
    return {
      ...nodeBaseDefault,
      reshape,
      id: "seq:" + genId(),
      kind: NodeKind.SEQ,
      children: nodes,
    } as Seq;
  }

  function createNot(child: InputNodeExpr, reshape?: Parser): Not {
    const childNode = toNode(child);
    return {
      ...nodeBaseDefault,
      kind: NodeKind.NOT,
      child: childNode,
      reshape,
      id: "not:" + childNode.id,
    } as Not;
  }

  function createOr(
    patterns: Array<Seq | Token | Ref | Or | Eof | string | ID | Recursion>,
    reshape?: Parser
  ): Or {
    return {
      ...nodeBaseDefault,
      kind: NodeKind.OR,
      patterns: patterns.map(toNode) as Array<Seq | Token | Ref>,
      reshape,
      id: "or:" + genId(),
    } as Or;
  }

  function createRepeat(
    pattern: InputNodeExpr,
    minmax?: [min: number | void, max?: number | void],
    reshape?: Parser<any, any>
  ): Repeat {
    const [min = 0, max = undefined] = minmax ?? [];
    return {
      ...nodeBaseDefault,
      id: "repeat:" + genId(),
      kind: NodeKind.REPEAT,
      pattern: toNode(pattern),
      min,
      max,
      reshape,
    };
  }

  function createToken(expr: string, reshape?: Parser<any, any>): Token {
    if (exprCache[expr]) {
      return exprCache[expr];
    }
    return (exprCache[expr] = {
      ...nodeBaseDefault,
      id: `expr:${expr}`,
      kind: NodeKind.TOKEN,
      expr,
      reshape,
    });
  }

  function createEof(): Eof {
    return {
      ...nodeBaseDefault,
      id: "EOF",
      kind: NodeKind.EOF,
      reshape: undefined,
    };
  }

  const RECURSION_ID = "RECURSION";
  const builder: Builder<ID> = {
    def: defineSymbol,
    ref: createRef,
    tok: createToken,
    repeat: createRepeat,
    R: {
      id: RECURSION_ID,
      kind: NodeKind.RECURSION,
      reshape: undefined,
    },
    repeat_seq(input, minmax, reshape) {
      return createRepeat(createSeq(input), minmax, reshape);
    },
    or: createOr,
    seq: createSeq,
    pair: createPair,
    not: createNot,
    opt<T extends Node>(input: InputNodeExpr): T {
      return { ...(toNode(input) as T), optional: true };
    },
    param,
    skip<T extends Node>(node: T | string): T {
      return { ...(toNode(node) as T), skip: true };
    },
    join(...expr: string[]): Token {
      return createToken(expr.join(""));
    },
    eof: createEof,
  };

  return { symbolMap: symbolMap, builder, compile };

  function param<T extends Node>(key: string, node: InputNodeExpr): T {
    return { ...(toNode(node) as T), key };
  }
}

const defaultReshape: Parser<any, any> = <T>(i: T): T => i;
const getOrCreateCache = (
  cache: PackratCache,
  id: string,
  pos: number,
  creator: () => ParseResult
): ParseResult => {
  const cached = cache.get(id, pos);
  if (cached) return cached;
  const result = creator();
  cache.add(id, pos, result);
  return result;
};

const createParseSuccess = (result: any, pos: number, len: number) => {
  return {
    error: false,
    result,
    len: len,
    pos: pos,
  } as ParseSuccess;
};

const createParseError = <ET extends ErrorType>(
  errorType: ET,
  pos: number,
  detail?: any
): ParseError => {
  return {
    error: true,
    errorType,
    pos,
    detail,
  };
};

export function compileRec(
  node: Node,
  opts: {
    symbolMap: SymbolMap;
    root: Node["id"];
    contextRoot: symbol | number;
  }
): RecParser {
  const reshape = node.reshape ?? defaultReshape;
  switch (node.kind) {
    case NodeKind.NOT: {
      const childParser = compileRec(node.child, opts);
      return (input, ctx) => {
        return getOrCreateCache(ctx.cache, node.id, ctx.pos, () => {
          const result = childParser(input, ctx);
          if (result.error === true) {
            return createParseSuccess(result, ctx.pos, 0);
          }
          return createParseError(
            ErrorType.Not_IncorrectMatch,
            ctx.pos,
            result.len
          );
        });
      };
    }

    case NodeKind.REF: {
      return (input, ctx) => {
        const resolved = opts.symbolMap[node.ref];
        if (!resolved) {
          throw new Error(`symbol not found: ${node.ref}`);
        }
        return getOrCreateCache(ctx.cache, node.id, ctx.pos, () =>
          resolved!(input, ctx)
        );
      };
    }
    case NodeKind.RECURSION: {
      // const childParser = compileRec(node.child, opts);
      return (input, ctx) => {
        const resolved = opts.symbolMap[opts.contextRoot];
        return getOrCreateCache(ctx.cache, node.id, ctx.pos, () =>
          resolved!(input, ctx)
        );
      };
    }

    case NodeKind.PAIR: {
      return (input: string, ctx) => {
        return getOrCreateCache(ctx.cache, node.id, ctx.pos, () => {
          const pairedEnd = readPairedBlock(
            ctx.tokenMap,
            ctx.pos,
            input.length,
            [node.open, node.close]
          );
          if (pairedEnd) {
            return createParseSuccess(
              input.slice(ctx.pos, pairedEnd),
              pairedEnd,
              pairedEnd - ctx.pos
            ) as ParseResult;
          }
          return createParseError(ErrorType.Pair_Unmatch, ctx.pos, 0);
        });
      };
    }

    case NodeKind.EOF: {
      return (input: string, ctx) => {
        const ended = Array.from(input).length === ctx.pos;
        if (ended) {
          return createParseSuccess("", ctx.pos, 0) as ParseResult;
        }
        return createParseError(ErrorType.Eof_Unmatch, ctx.pos);
      };
    }

    case NodeKind.TOKEN: {
      // const re = new RegExp(`^${node.expr}`, "m");
      return (input: string, ctx) => {
        return getOrCreateCache(ctx.cache, node.id, ctx.pos, () => {
          const cached = ctx.cache.get(node.id, ctx.pos);
          if (cached) return cached;
          const matched = findPatternAt(input, node.expr, ctx.pos);
          if (matched == null) {
            if (node.optional) {
              return createParseSuccess(null, ctx.pos, 0);
            } else {
              return createParseError(
                ErrorType.Token_Unmatch,
                ctx.pos,
                `"${input.slice(ctx.pos)}" does not fill: ${node.expr}`
              );
            }
          }
          return createParseSuccess(
            reshape(matched),
            ctx.pos,
            Array.from(matched).length
          );
        });
      };
    }
    case NodeKind.OR: {
      const compiledPatterns = node.patterns.map((p) => {
        return {
          parse: compileRec(p, opts),
          node: p,
        };
      });
      return (input: string, ctx) => {
        return getOrCreateCache(ctx.cache, node.id, ctx.pos, () => {
          const errors: ParseError[] = [];
          for (const next of compiledPatterns) {
            const parsed = next.parse(input, ctx);
            if (parsed.error === true) {
              if (node.optional) {
                return createParseSuccess(null, ctx.pos, 0);
              }
              errors.push(parsed);
              continue;
            }
            return parsed as ParseResult;
          }
          return createParseError(ErrorType.Or_UnmatchAll, ctx.pos, {
            message: `"${input.slice(ctx.pos)}" does not match any pattern`,
            children: errors,
          });
        });
      };
    }
    case NodeKind.REPEAT: {
      const parser = compileRec(node.pattern, opts);
      return (input: string, opts) => {
        return getOrCreateCache(opts.cache, node.id, opts.pos, () => {
          const xs: string[] = [];
          let cursor = opts.pos;
          while (cursor < input.length) {
            const match = parser(input, { ...opts, pos: cursor });
            if (match.error === true) break;
            // stop infinite loop
            if (match.len === 0) {
              throw new Error(`Zero offset repeat item is not allowed`);
            }
            xs.push(match.result);
            cursor += match.len;
          }
          // size check
          // TODO: detect max at adding
          if (xs.length < node.min || (node.max && xs.length > node.max)) {
            return createParseError(
              ErrorType.Repeat_RangeError,
              opts.pos,
              `not fill range: ${xs.length} in [${node.min}, ${
                node.max ?? ""
              }] `
            );
          }
          return createParseSuccess(
            xs.map(reshape as any),
            opts.pos,
            cursor - opts.pos
          );
        });
      };
    }
    case NodeKind.SEQ: {
      const parsers = node.children.map((c) => {
        const parse = compileRec(c, opts);
        return { parse, node: c };
      });
      return (input: string = "", ctx) => {
        return getOrCreateCache(ctx.cache, node.id, ctx.pos, () => {
          const result: any = {};
          let cursor = ctx.pos;
          let isObject = false;
          let eaten = "";
          for (const parser of parsers) {
            const match = parser.parse(input, { ...ctx, pos: cursor });
            if (match.error !== true) {
              // success
              if (!parser.node.skip && match.len > 0) {
                const text = input.slice(cursor, cursor + match.len);
                eaten += text;
              }
              cursor += match.len;
              if (parser.node.key && !parser.node.skip) {
                const reshaped = match.result;
                result[parser.node.key] = reshaped;
                isObject = true;
              }
            } else {
              return createParseError(ErrorType.Seq_Stop, ctx.pos, {
                child: match,
              });
            }
          }
          const reshaped = reshape(isObject ? result : eaten);
          console.log(">", eaten, cursor);
          return createParseSuccess(reshaped, ctx.pos, cursor - ctx.pos);
        });
      };
    }
    default: {
      throw new Error("WIP expr and parser");
    }
  }
}

import { test, run, cancelAll, is, err } from "@mizchi/test";
if (process.env.NODE_ENV === "test" && require.main === module) {
  test("whitespace", () => {
    const { compile, builder: $ } = createContext();
    is(compile($.tok("\\s+"))(" ").result, " ");
    is(compile($.tok("(\\s+)?"))("").result, "");
    is(compile($.tok("(\\s+)?"))("  ").result, "  ");
    is(compile($.tok("(\\s+)?"))(" \n ").result, " \n ");
    is(compile($.tok("(\\s+)?"))(" \t ").result, " \t ");
  });

  test("token", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a"]));
    is(parser("a").result, "a");
  });

  test("token2", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.tok("\\s*a"));
    is(parser("a").result, "a");
    is(parser(" a").result, " a");
    is(parser("  y").error, true);
  });

  test("nested-token", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a", $.seq(["b", "c"])]));
    is(parser("abc").result, "abc");
    is(parser("adb").error, true);
  });

  test("not", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq([$.not("a"), "\\w", $.not("b"), "\\w"]));
    is(parser("ba").result, "ba");
    is(parser("ab").error, true);
    is(parser("aa").error, true);
    is(parser("bb").error, true);
  });

  test("seq-shorthand", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.seq([
      ["a", "x"],
      ["b", "y"],
    ]);
    const parser = compile(seq);
    is(parser("xy"), {
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
    });
  });

  test("seq", () => {
    const { compile, builder: $ } = createContext();

    const seq = $.seq([$.param("a", "x"), $.param("b", "y")]);
    const parser = compile(seq);
    is(parser("xy"), {
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
    });
    is(parser("xyz"), {
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
    });
    is(parser("xz"), {
      error: true,
      errorType: ErrorType.Seq_Stop,
      pos: 0,
      detail: {
        child: {
          pos: 1,
          detail: '"z" does not fill: y',
          error: true,
          errorType: ErrorType.Token_Unmatch,
        },
      },
    });
    is(parser(" xy"), {
      error: true,
      errorType: ErrorType.Seq_Stop,
      pos: 0,
      detail: {
        child: {
          error: true,
          pos: 0,
          errorType: ErrorType.Token_Unmatch,
          detail: '" xy" does not fill: x',
        },
      },
    });
  });

  test("seq-skip", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a", $.skip("\\s*"), "b"]));
    is(parser("a   b").result, "ab");
  });

  test("seq-eof", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a", $.eof()]));
    console.log("parse", parser("a"));
    is(parser("a").result, "a");
    is(parser("a ").error, true);

    const parser2 = compile($.seq([$.eof()]));
    is(parser2("").result, "");
  });

  test("seq-with-param", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.seq([$.param("a", "a")]);
    const parser = compile(seq);

    is(parser("a"), { result: { a: "a" }, len: 1, pos: 0 });
    is(parser("ab"), {
      result: { a: "a" },
      len: 1,
      pos: 0,
    });
    is(parser("x"), {
      error: true,
      errorType: ErrorType.Seq_Stop,
      pos: 0,
      detail: {
        child: {
          pos: 0,
          error: true,
          errorType: ErrorType.Token_Unmatch,
          detail: `"x" does not fill: a`,
        },
      },
    });
  });

  test("reuse symbol", () => {
    enum T {
      _ = 1,
    }
    const { compile, builder: $ } = createContext({ refs: T as any });
    const __ = $.def(T._, "\\s+");
    // use result or enum
    const seq = $.seq(["a", T._, "b", __, "c"]);
    const parser = compile(seq);
    is(parser("a b c"), {
      result: "a b c",
      len: 5,
      pos: 0,
    });
  });

  test("repeat", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.repeat(
      $.seq([
        ["a", "x"],
        ["b", "y"],
      ])
    );
    const parser = compile(seq);
    is(parser(""), {
      error: false,
      result: [],
      pos: 0,
      len: 0,
    });
    is(parser("xy"), {
      error: false,
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    is(parser("xyxy"), {
      error: false,
      result: [
        { a: "x", b: "y" },
        { a: "x", b: "y" },
      ],
      pos: 0,
      len: 4,
    });
    is(parser("xyxz"), {
      error: false,
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    is(parser("xzxy"), {
      result: [],
      pos: 0,
      len: 0,
      error: false,
    });
  });

  test("repeat:str", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.repeat($.seq(["a", "b", $.eof()])));
    is(parser("ab"), {
      error: false,
      result: ["ab"],
      pos: 0,
      len: 2,
    });
    const parser2 = compile(
      $.seq([$.repeat($.seq(["a", "b", $.eof()])), "\\s*"])
    );
    is(parser2("ab"), {
      error: false,
      result: "ab",
      pos: 0,
      len: 2,
    });
  });

  test("repeat:minmax", () => {
    const { compile, builder: $ } = createContext();
    const rep = $.repeat($.seq(["xy"]), [1, 2]);
    const parser = compile(rep);
    // 1
    is(parser("xy"), {
      error: false,
      result: ["xy"],
      len: 2,
    });

    // 2
    is(parser("xyxy"), {
      error: false,
      result: ["xy", "xy"],
      len: 4,
    });
    // range out
    // 0
    is(parser(""), { error: true });
    // 3
    is(parser("xyxyxy"), { error: true });
  });

  test("repeat:direct-repeat", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.repeat($.seq(["ab"]), [1, 2]));
    is(parser("ab"), {
      result: ["ab"],
      pos: 0,
      len: 2,
    });
    is(parser("abab"), {
      result: ["ab", "ab"],
      pos: 0,
      len: 4,
    });
  });

  test("seq:multiline", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.seq(["aaa\\sbbb"]);
    const parser = compile(seq);
    is(parser(`aaa\nbbb`), {
      result: "aaa\nbbb",
      len: 7,
      pos: 0,
    });
  });

  test("repeat", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.repeat(
      $.seq([
        ["a", "x"],
        ["b", "y"],
      ])
    );
    const parser = compile(seq);
    is(parser("xy"), {
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    is(parser("xyxy"), {
      result: [
        { a: "x", b: "y" },
        { a: "x", b: "y" },
      ],
      pos: 0,
      len: 4,
    });
    is(parser("xyxz"), {
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    is(parser("xzxy"), { result: [], pos: 0, len: 0 });
  });

  test("repeat:with-padding", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.seq([
      "_+",
      $.param(
        "xylist",
        $.repeat(
          $.seq([
            ["a", "x"],
            ["b", "y"],
          ])
        )
      ),
      "_+",
    ]);
    const parser = compile(seq);

    is(parser("__xyxy_"), {
      result: {
        xylist: [
          { a: "x", b: "y" },
          { a: "x", b: "y" },
        ],
      },
      pos: 0,
      len: 7,
    });
  });

  test("or", () => {
    const { compile, builder: $ } = createContext();

    const seq = $.or(["x", "y"]);
    const parser = compile(seq);
    is(parser("x"), {
      result: "x",
      len: 1,
    });
    is(parser("y"), {
      result: "y",
      len: 1,
    });
    is(parser("z"), {
      error: true,
      errorType: ErrorType.Or_UnmatchAll,
      pos: 0,
      detail: {
        message: '"z" does not match any pattern',
        children: [
          {
            error: true,
            pos: 0,
            errorType: ErrorType.Token_Unmatch,
            detail: '"z" does not fill: x',
          },
          {
            error: true,
            pos: 0,
            errorType: ErrorType.Token_Unmatch,
            detail: '"z" does not fill: y',
          },
        ],
      },
    });
  });

  test("or:with-cache", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.or([$.seq(["x", "y", "z"]), $.seq(["x", "y", "a"])]);
    const parser = compile(seq);
    is(parser("xya"), {
      result: "xya",
      len: 3,
      pos: 0,
    });
    console.log("xyb", JSON.stringify(parser("xyb"), null, 2));
    is(parser("xyb"), {
      error: true,
      pos: 0,
      errorType: ErrorType.Or_UnmatchAll,
      detail: {
        message: '"xyb" does not match any pattern',
        children: [
          {
            error: true,
            errorType: ErrorType.Seq_Stop,
            pos: 0,
            detail: {
              child: {
                error: true,
                pos: 0,
                errorType: ErrorType.Token_Unmatch,
                detail: '"xyb" does not fill: xyz',
              },
            },
          },
          {
            error: true,
            errorType: ErrorType.Seq_Stop,
            pos: 0,
            detail: {
              child: {
                error: true,
                pos: 0,
                errorType: ErrorType.Token_Unmatch,
                detail: '"xyb" does not fill: xya',
              },
            },
          },
        ],
      },
    });
  });

  test("reuse recursive with suffix", () => {
    enum E {
      Paren,
    }
    const { compile, builder: $ } = createContext({
      refs: E,
    });
    const paren = $.def(
      E.Paren,
      $.seq([
        "\\(",
        $.or([
          // nested: ((1))
          $.ref(E.Paren),
          // (1),
          "1",
        ]),
        "\\)",
      ])
    );
    const parser = compile($.ref(paren));
    // console.log("compile success");
    is(parser("(1)_"), { result: "(1)", len: 3, pos: 0 });
    is(parser("((1))"), {
      result: "((1))",
      len: 5,
      pos: 0,
    });
    is(parser("(((1)))"), {
      result: "(((1)))",
      len: 7,
      pos: 0,
    });
    is(parser("((((1))))"), {
      result: "((((1))))",
      len: 9,
      pos: 0,
    });
    is(parser("((1)").error, true);
  });

  test("reuse with recursion", () => {
    // enum E {
    //   Paren,
    // }
    const { compile, builder: $ } = createContext({
      // refs: E,
    });
    const paren = $.def(
      Symbol("recursion-test"),
      $.seq([
        "\\(",
        $.or([
          // nested: ((1))
          $.R,
          // $.ref(E.Paren),
          // (1),
          "1",
        ]),
        "\\)",
      ])
    );
    const parser = compile($.ref(paren));
    // console.log("compile success");
    is(parser("(1)_"), { result: "(1)", len: 3, pos: 0 });
    is(parser("((1))"), {
      result: "((1))",
      len: 5,
      pos: 0,
    });
    is(parser("(((1)))"), {
      result: "(((1)))",
      len: 7,
      pos: 0,
    });
    is(parser("((((1))))"), {
      result: "((((1))))",
      len: 9,
      pos: 0,
    });
    is(parser("((1)").error, true);
  });

  test("pair", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.pair(["<", ">"]), { pairs: ["<", ">"] });
    is(parser("<>").result, "<>");
    is(parser("<<>>").result, "<<>>");
    is(parser("<<>").error, true);
    is(parser("<<a>").error, true);
    is(parser(">").error, true);
    is(parser("").error, true);
  });

  run({ stopOnFail: true, stub: true });
}
