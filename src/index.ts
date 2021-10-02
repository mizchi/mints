import {
  buildTokenMap,
  findPatternAt,
  readPairedBlock,
  TokenMap,
} from "./utils";
export enum Kind {
  SEQ = 1,
  REPEAT,
  EXPR,
  OR,
  REF,
  EOF,
  PAIR,
  NOT,
}

const defaultReshape: Parser<any, any> = <T>(i: T): T => i;

type NodeBase = {
  id: string;
  reshape: Parser;
  key: string | void;
  nullable: boolean;
  skip: boolean;
};
const nodeBaseDefault: Omit<NodeBase, "id" | "reshape"> = {
  key: undefined,
  nullable: false,
  skip: false,
};

export type Node = Seq | Expr | Or | Repeat | Ref | Eof | Pair | Not;

export type Eof = NodeBase & {
  kind: Kind.EOF;
};

export type Pair = NodeBase & {
  kind: Kind.PAIR;
  open: string;
  close: string;
};

export type Not = NodeBase & {
  kind: Kind.NOT;
  child: Node;
};

export type Seq = NodeBase & {
  kind: Kind.SEQ;
  children: Node[];
};

export type Ref = NodeBase & {
  kind: Kind.REF;
  ref: string;
};

export type Repeat = NodeBase & {
  kind: Kind.REPEAT;
  pattern: Node;
};

export type Or = NodeBase & {
  kind: Kind.OR;
  patterns: Array<Seq | Expr | Ref>;
};

export type Expr = NodeBase & {
  kind: Kind.EXPR;
  expr: string;
};

type Cache = { [key: `${number}@${string}`]: ParseSuccess };
type SeqCacheApi = {
  export(): Cache;
  add(id: Node["id"], pos: number, result: any): void;
  get(id: Node["id"], pos: number): ParseResult | void;
};

function createCache(): SeqCacheApi {
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

type NodeOrExprString = Node | string;

type ParseSuccess = {
  error?: false;
  result: any;
  len: number;
};

type ParseErrorBase = {
  error: true;
  pos: number;
  // errorType: "Unmatch" | "Seq:Stop" | "Seq:NotMatchAll";
  detail?: string;
};

type ParseError =
  | (ParseErrorBase & {
      errorType: "Not:IncorrectMatch";
    })
  | (ParseErrorBase & {
      errorType: "Pair:Unmatch";
    })
  | (ParseErrorBase & {
      errorType: "Eof:Unmatch";
    })
  | (ParseErrorBase & {
      errorType: "Expr:Unmatch";
      detail?: string;
    })
  | (ParseErrorBase & {
      errorType: "Seq:NotMatchAll";
      detail?: string;
    })
  | (ParseErrorBase & {
      errorType: "Seq:Stop";
    })
  | (ParseErrorBase & {
      errorType: "Or:UnmatchAll";
      children: Array<Omit<ParseError, "cache">>;
    });

type ParseResult = ParseSuccess | ParseError;

type ParseOption = {
  cache: SeqCacheApi;
  pos: number;
  tokenMap: TokenMap<string>;
};

type RecParser = (input: string, opts: ParseOption) => ParseResult;

export type Parser<In = any, Out = any> = (
  input: In,
  opts?: {
    cursor?: number;
    matchAll?: boolean;
    cache?: SeqCacheApi;
    tokenMap: TokenMap<string>;
  }
) => Out;

type SymbolMap = { [key: string]: RecParser | void };

// export type Builder = ReturnType<typeof createContext>["builder"];

export type Builder<ID = string | number> = {
  def(refId: ID | void, node: NodeOrExprString, reshape?: Parser): Ref;
  ref(refId: string | number, reshape?: Parser): Ref;
  expr(expr: string, reshape?: Parser): Expr;
  repeat(pattern: NodeOrExprString, reshape?: Parser): Repeat;
  or: (
    patterns: Array<Seq | Expr | Ref | Or | Eof | string>,
    reshape?: Parser
  ) => Or;
  seq(
    children: Array<NodeOrExprString | [key: string, ex: NodeOrExprString]>,
    reshape?: Parser
  ): Seq;
  pair(pair: [open: string, close: string], reshape?: Parser): Pair;
  not(child: NodeOrExprString, reshape?: Parser): Not;
  nullable<T extends Node>(node: T | string): T;
  param<T extends Node>(key: string, node: T | string, reshape?: Parser): T;
  skip<T extends Node>(node: T | string): T;
  join(...expr: string[]): Expr;
  eof(): Eof;
};

export function createContext<ID extends string | number = string | number>() {
  const symbolMap: SymbolMap = {};
  const toNode = (node: NodeOrExprString): Node =>
    typeof node === "string" ? createExpr(node) : node;
  let cnt = 0;
  const genId = () => (cnt++).toString();
  const exprCache: { [key: string]: Expr } = {};

  function compile(
    node: Node,
    { pairs = [] }: { pairs?: string[] } = {}
  ): Parser {
    const parse = compileRec(node, { symbolMap, root: node.id });
    return (input: string, opts: Partial<ParseOption> = {}) => {
      const cache = createCache();
      const tokenMap = buildTokenMap(input, pairs);
      return parse(input, {
        cache: cache,
        pos: 0,
        tokenMap,
        ...opts,
      });
    };
  }

  function defineSymbol(
    refId: string | number | void,
    node: NodeOrExprString,
    reshape: Parser = defaultReshape
  ): Ref {
    const id = refId || genId();
    if (symbolMap[id]) {
      throw new Error(`Symbol:${id} is already defined`);
    }
    symbolMap[id] = () => {
      throw new Error("Override me");
    };
    const parser = compile(toNode(node));
    symbolMap[id] = parser as any;
    return createRef(id.toString(), reshape);
  }

  function createRef(
    refId: string | number,
    reshape: Parser = defaultReshape
  ): Ref {
    return {
      ...nodeBaseDefault,
      id: "symbol:" + genId(),
      kind: Kind.REF,
      ref: refId.toString(),
      reshape,
    } as Ref;
  }
  function createPair(
    pair: [open: string, close: string],
    reshape: Parser = defaultReshape
  ): Pair {
    return {
      ...nodeBaseDefault,
      id: "symbol:" + genId(),
      kind: Kind.PAIR,
      open: pair[0],
      close: pair[1],
      reshape,
    } as Pair;
  }

  function createSeq(
    children: Array<NodeOrExprString | [key: string, ex: NodeOrExprString]>,
    reshape: Parser = defaultReshape
  ): Seq {
    // compose expr
    const nodes: Node[] = [];
    let currentExprs: string[] = [];
    children.forEach((child) => {
      if (typeof child === "string") {
        currentExprs.push(child);
      } else if (
        // plane expr
        !Array.isArray(child) &&
        !child.skip &&
        child.kind === Kind.EXPR &&
        child.reshape === defaultReshape &&
        child.key == null
      ) {
        currentExprs.push(child.expr);
      } else {
        // compose queued expr list to one expr
        if (currentExprs.length > 0) {
          nodes.push(createExpr(currentExprs.join("")));
          currentExprs = [];
        }
        if (Array.isArray(child)) {
          // shorthand: [key, expr]
          const [key, ex] = child;
          nodes.push(param(key, toNode(ex)));
        } else {
          // raw expr
          nodes.push(child);
        }
      }
    });
    nodes.push(createExpr(currentExprs.join("")));
    return {
      ...nodeBaseDefault,
      reshape,
      id: "seq:" + genId(),
      kind: Kind.SEQ,
      children: nodes,
    } as Seq;
  }

  function createNot(
    child: NodeOrExprString,
    reshape: Parser = defaultReshape
  ): Not {
    const childNode = toNode(child);
    return {
      ...nodeBaseDefault,
      kind: Kind.NOT,
      child: childNode,
      reshape,
      id: "not:" + childNode.id,
    } as Not;
  }

  function createOr(
    patterns: Array<Seq | Expr | Ref | Or | Eof | string>,
    reshape: Parser = defaultReshape
  ): Or {
    return {
      ...nodeBaseDefault,
      kind: Kind.OR,
      patterns: patterns.map(toNode) as Array<Seq | Expr | Ref>,
      reshape,
      id: "or:" + genId(),
    } as Or;
  }

  function createRepeat(
    pattern: NodeOrExprString,
    reshape: Parser<any, any> = defaultReshape
  ): Repeat {
    return {
      ...nodeBaseDefault,
      id: "repeat:" + genId(),
      kind: Kind.REPEAT,
      pattern: toNode(pattern),
      reshape,
    };
  }

  function createExpr(
    expr: string,
    reshape: Parser<any, any> = defaultReshape
  ): Expr {
    if (exprCache[expr]) {
      return exprCache[expr];
    }
    return (exprCache[expr] = {
      ...nodeBaseDefault,
      id: `expr:${expr}`,
      kind: Kind.EXPR,
      expr,
      reshape,
    });
  }

  function createEof(): Eof {
    return {
      ...nodeBaseDefault,
      id: "EOF",
      kind: Kind.EOF,
      reshape: defaultReshape,
    };
  }

  const builder: Builder<ID> = {
    def: defineSymbol,
    ref: createRef,
    expr: createExpr,
    repeat: createRepeat,
    or: createOr,
    seq: createSeq,
    pair: createPair,
    not: createNot,
    nullable<T extends Node>(node: T | string): T {
      return { ...(toNode(node) as T), nullable: true };
    },
    param,
    skip<T extends Node>(node: T | string): T {
      return { ...(toNode(node) as T), skip: true };
    },
    join(...expr: string[]): Expr {
      return createExpr(expr.join(""));
    },
    eof: createEof,
  };

  return { symbolMap, builder, compile };

  function param<T extends Node>(key: string, node: T | string): T {
    return { ...(toNode(node) as T), key };
  }
}

export function compileRec(
  node: Node,
  opts: { symbolMap: SymbolMap; root: Node["id"] }
): RecParser {
  // console.log("[compiling...]", node.id);
  // const existsParentCache = !!cache;
  const reshape = node.reshape;
  switch (node.kind) {
    case Kind.NOT: {
      const childParser = compileRec(node.child, opts);
      return (input, ctx) => {
        const result = childParser(input, ctx);
        // invert result
        if (result.error === true) {
          return {
            result: "",
            len: 0,
            pos: ctx.pos,
          } as ParseResult;
        }
        return {
          error: true,
          errorType: "Not:IncorrectMatch",
          len: 0,
          pos: ctx.pos,
        } as ParseError;
      };
    }

    case Kind.REF: {
      return (input, ctx) => {
        const resolved = opts.symbolMap[node.ref];
        if (!resolved) {
          throw new Error(`symbol not found: ${node.ref}`);
        }
        const cached = ctx.cache.get(node.id, ctx.pos);
        if (cached) return cached;

        const result = resolved(input, ctx);
        ctx.cache.add(node.id, ctx.pos, result);
        return result;
      };
    }
    case Kind.PAIR: {
      return (input: string, ctx) => {
        const pairedEnd = readPairedBlock(ctx.tokenMap, ctx.pos, input.length, [
          node.open,
          node.close,
        ]);
        if (pairedEnd) {
          return {
            result: input.slice(ctx.pos, pairedEnd),
            len: 0,
            pos: ctx.pos,
          } as ParseResult;
        }
        return {
          error: true,
          pos: ctx.pos,
          errorType: "Eof:Unmatch",
        } as ParseError;
      };
    }

    case Kind.EOF: {
      return (input: string, ctx) => {
        const ended = Array.from(input).length === ctx.pos;
        if (ended) {
          return {
            result: "",
            len: 0,
            pos: ctx.pos,
          } as ParseResult;
        }
        return {
          error: true,
          pos: ctx.pos,
          errorType: "Eof:Unmatch",
        } as ParseError;
      };
    }

    case Kind.EXPR: {
      // const re = new RegExp(`^${node.expr}`, "m");
      return (input: string, ctx) => {
        const cached = ctx.cache.get(node.id, ctx.pos);
        if (cached) return cached;
        // const re = new RegExp(`(?<=.{${pos}})${node.expr}`, "m");
        const matched = findPatternAt(input, node.expr, ctx.pos);
        if (matched == null) {
          if (node.nullable) {
            return {
              result: null,
              len: 0,
              pos: ctx.pos,
            };
          }
          return {
            error: true,
            pos: ctx.pos,
            errorType: "Expr:Unmatch",
            detail: `"${input.slice(ctx.pos)}" does not fill: ${node.expr}`,
          };
        }
        // const target = matched;
        const ret: ParseResult = {
          result: reshape(matched),
          len: Array.from(matched).length,
        };
        ctx.cache.add(node.id, ctx.pos, ret);
        return ret;
      };
    }
    case Kind.OR: {
      const compiledPatterns = node.patterns.map((p) => {
        return {
          parse: compileRec(p, opts),
          node: p,
        };
      });
      return (input: string, ctx) => {
        const errors: ParseError[] = [];
        for (const next of compiledPatterns) {
          let parsed = ctx.cache.get(next.node.id, ctx.pos) as ParseResult;
          if (parsed == null) {
            parsed = next.parse(input, ctx);
            ctx.cache.add(next.node.id, ctx.pos, parsed);
          }
          if (parsed.error === true) {
            if (node.nullable) {
              return {
                result: null,
                len: 0,
                pos: ctx.pos,
              };
            }
            errors.push(parsed);
            continue;
          }
          return parsed as ParseResult;
        }
        // console.log("[or:parse:fail]", input);
        return {
          error: true,
          pos: ctx.pos,
          errorType: "Or:UnmatchAll",
          detail: `"${input.slice(ctx.pos)}" does not match any pattern`,
          children: errors,
        } as ParseError;
      };
    }
    case Kind.REPEAT: {
      const parser = compileRec(node.pattern, opts);
      return (input: string, opts) => {
        const xs: string[] = [];
        let cursor = opts.pos;
        while (cursor < input.length) {
          const match = parser(input, { ...opts, pos: cursor });
          if (match.error === true) break;
          // stop infinite loop
          if (match.len === 0) {
            throw new Error(`Zero offset repeat is not allowed`);
          }
          xs.push(match.result);
          cursor += match.len;
        }
        return {
          result: xs.map(reshape as any),
          len: cursor - opts.pos,
          pos: opts.pos,
        };
      };
    }
    case Kind.SEQ: {
      const parsers = node.children.map((c) => {
        const parse = compileRec(c, opts);
        return { parse, node: c };
      });
      return (input: string = "", ctx) => {
        const result: any = {};
        let cursor = ctx.pos;
        let isObject = false;
        let eaten = "";
        for (const parser of parsers) {
          const match = (ctx.cache.get(parser.node.id, cursor) ??
            parser.parse(input, {
              ...ctx,
              pos: cursor,
            })) as ParseResult;

          if (match.error !== true) {
            if (!parser.node.skip && match.len > 0) {
              const text = input.slice(cursor, cursor + match.len);
              eaten += text;
            }
            ctx.cache.add(parser.node.id, cursor, match);
            cursor += match.len;
            if (parser.node.key && !parser.node.skip) {
              const reshaped = match.result;
              result[parser.node.key] = reshaped;
              isObject = true;
            }
          } else {
            return {
              error: true,
              errorType: "Seq:Stop",
              pos: cursor,
              child: match,
            };
          }
        }
        const ret = isObject ? result : eaten;
        return {
          result: node.reshape(ret),
          len: cursor - ctx.pos,
          pos: ctx.pos,
        };
      };
    }
    default: {
      throw new Error("WIP expr and parser");
    }
  }
}

// @ts-ignore
import { test, run, cancelAll } from "@mizchi/testio/dist/testio.cjs";
import assert from "assert";

if (process.env.NODE_ENV === "test" && require.main === module) {
  // @ts-ignore
  const eq = (...args: any[]) => assert.deepStrictEqual(...(args as any));

  test("whitespace", () => {
    const { compile, builder: $ } = createContext();
    eq(compile($.expr("\\s+"))(" ").result, " ");
    eq(compile($.expr("(\\s+)?"))("").result, "");
    eq(compile($.expr("(\\s+)?"))("  ").result, "  ");
    eq(compile($.expr("(\\s+)?"))(" \n ").result, " \n ");
    eq(compile($.expr("(\\s+)?"))(" \t ").result, " \t ");
  });

  test("expr", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a"]));
    eq(parser("a").result, "a");
  });

  test("expr", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["\\s*", "a"]));
    eq(parser("a").result, "a");
    eq(parser(" a").result, " a");
    eq(parser("  y").error, true);
  });

  test("nested-expr", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a", $.seq(["b", "c"])]));
    eq(parser("abc").result, "abc");
    eq(parser("adb").error, true);
  });

  test("not", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq([$.not("a"), "\\w", $.not("b"), "\\w"]));
    eq(parser("ba").result, "ba");
    eq(parser("ab").error, true);
    eq(parser("aa").error, true);
    eq(parser("bb").error, true);
  });

  test("seq-shorthand", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.seq([
      ["a", "x"],
      ["b", "y"],
    ]);
    const parser = compile(seq);
    assert.deepStrictEqual(parser("xy"), {
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
    });
  });

  test("seq", () => {
    const { compile, builder: $ } = createContext();

    const seq = $.seq([$.param("a", "x"), $.param("b", "y")]);
    const parser = compile(seq);
    assert.deepStrictEqual(parser("xy"), {
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
    });
    assert.deepStrictEqual(parser("xyz"), {
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
    });
    assert.deepStrictEqual(parser("xz"), {
      error: true,
      errorType: "Seq:Stop",
      pos: 1,
      child: {
        pos: 1,
        detail: '"z" does not fill: y',
        error: true,
        errorType: "Expr:Unmatch",
      },
    });
    assert.deepStrictEqual(parser(" xy"), {
      error: true,
      errorType: "Seq:Stop",
      pos: 0,
      child: {
        error: true,
        pos: 0,
        errorType: "Expr:Unmatch",
        detail: '" xy" does not fill: x',
      },
    });
  });

  test("seq-skip", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a", $.skip("\\s*"), "b"]));
    eq(parser("a   b").result, "ab");
  });

  test("seq-eof", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.seq(["a", $.eof()]));
    console.log("parse", parser("a"));
    eq(parser("a").result, "a");
    eq(parser("a ").error, true);

    const parser2 = compile($.seq([$.eof()]));
    eq(parser2("").result, "");
  });

  test("seq-with-param", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.seq([$.param("a", "a")]);
    const parser = compile(seq);

    assert.deepStrictEqual(parser("a"), { result: { a: "a" }, len: 1, pos: 0 });
    assert.deepStrictEqual(parser("ab"), {
      result: { a: "a" },
      len: 1,
      pos: 0,
    });
    assert.deepStrictEqual(parser("x"), {
      error: true,
      errorType: "Seq:Stop",
      pos: 0,
      child: {
        pos: 0,
        error: true,
        errorType: "Expr:Unmatch",
        detail: `"x" does not fill: a`,
      },
    });
  });

  test("reuse symbol", () => {
    const { compile, builder: $ } = createContext();
    const __ = $.def("__", "\\s+");
    const seq = $.seq(["a", __, "b", __, "c"]);
    const parser = compile(seq);
    assert.deepStrictEqual(parser("a b c"), {
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
    assert.deepStrictEqual(parser("xy"), {
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    assert.deepStrictEqual(parser("xyxy"), {
      result: [
        { a: "x", b: "y" },
        { a: "x", b: "y" },
      ],
      pos: 0,
      len: 4,
    });
    assert.deepStrictEqual(parser("xyxz"), {
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    assert.deepStrictEqual(parser("xzxy"), { result: [], pos: 0, len: 0 });
  });

  test("repeat:str", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.repeat($.seq(["a", "b", $.eof()])));
    assert.deepStrictEqual(parser("ab"), {
      result: ["ab"],
      pos: 0,
      len: 2,
    });
    const parser2 = compile(
      $.seq([$.repeat($.seq(["a", "b", $.eof()])), "\\s*"])
    );
    assert.deepStrictEqual(parser2("ab"), {
      result: "ab",
      pos: 0,
      len: 2,
    });
  });

  test("seq:multiline", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.seq(["aaa\\sbbb"]);
    const parser = compile(seq);
    assert.deepStrictEqual(parser(`aaa\nbbb`), {
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
    assert.deepStrictEqual(parser("xy"), {
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    assert.deepStrictEqual(parser("xyxy"), {
      result: [
        { a: "x", b: "y" },
        { a: "x", b: "y" },
      ],
      pos: 0,
      len: 4,
    });
    assert.deepStrictEqual(parser("xyxz"), {
      result: [{ a: "x", b: "y" }],
      pos: 0,
      len: 2,
    });
    assert.deepStrictEqual(parser("xzxy"), { result: [], pos: 0, len: 0 });
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

    assert.deepStrictEqual(parser("__xyxy_"), {
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
    assert.deepStrictEqual(parser("x"), {
      result: "x",
      len: 1,
    });
    assert.deepStrictEqual(parser("y"), {
      result: "y",
      len: 1,
    });
    assert.deepStrictEqual(parser("z"), {
      error: true,
      errorType: "Or:UnmatchAll",
      detail: '"z" does not match any pattern',
      pos: 0,
      children: [
        {
          error: true,
          pos: 0,
          errorType: "Expr:Unmatch",
          detail: '"z" does not fill: x',
        },
        {
          error: true,
          pos: 0,
          errorType: "Expr:Unmatch",
          detail: '"z" does not fill: y',
        },
      ],
    });
  });

  test("or:with-cache", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.or([$.seq(["x", "y", "z"]), $.seq(["x", "y", "a"])]);
    const parser = compile(seq);
    assert.deepStrictEqual(parser("xya"), {
      result: "xya",
      len: 3,
      pos: 0,
    });
    console.log("xyb", JSON.stringify(parser("xyb"), null, 2));
    assert.deepStrictEqual(parser("xyb"), {
      error: true,
      pos: 0,
      errorType: "Or:UnmatchAll",
      detail: '"xyb" does not match any pattern',
      children: [
        {
          error: true,
          errorType: "Seq:Stop",
          pos: 0,
          child: {
            error: true,
            pos: 0,
            errorType: "Expr:Unmatch",
            detail: '"xyb" does not fill: xyz',
          },
        },
        {
          error: true,
          errorType: "Seq:Stop",
          pos: 0,
          child: {
            error: true,
            pos: 0,
            errorType: "Expr:Unmatch",
            detail: '"xyb" does not fill: xya',
          },
        },
      ],
    });
  });

  test("reuse recursive with suffix", () => {
    const { compile, builder: $ } = createContext();
    const paren = $.def(
      "paren",
      $.seq([
        "\\(",
        $.or([
          // nested: ((1))
          $.ref("paren"),
          // (1),
          "1",
        ]),
        "\\)",
      ])
    );
    const parser = compile(paren);
    // console.log("compile success");
    assert.deepStrictEqual(parser("(1)_"), { result: "(1)", len: 3, pos: 0 });
    assert.deepStrictEqual(parser("((1))"), {
      result: "((1))",
      len: 5,
      pos: 0,
    });
    assert.deepStrictEqual(parser("(((1)))"), {
      result: "(((1)))",
      len: 7,
      pos: 0,
    });
    assert.deepStrictEqual(parser("((((1))))"), {
      result: "((((1))))",
      len: 9,
      pos: 0,
    });
    assert.deepStrictEqual(parser("((1)").error, true);
  });

  test("pair", () => {
    const { compile, builder: $ } = createContext();
    const parser = compile($.pair(["<", ">"]), { pairs: ["<", ">"] });
    eq(parser("<>").result, "<>");
    eq(parser("<<>>").result, "<<>>");
    eq(parser("<<>").error, true);
    eq(parser("<<a>").error, true);
    eq(parser(">").error, true);
    eq(parser("").error, true);
  });

  run({ stopOnFail: true, stub: true });
}
