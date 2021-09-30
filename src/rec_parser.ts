export enum Kind {
  SEQ = 1,
  REPEAT,
  EXPR,
  OR,
  SYMBOL,
  RECURSION,
}

const defaultReshape: Parser<any, any> = <T>(i: T): T => i;

type NodeBase = {
  id: string;
  reshape: Parser;
  key: string | void;
  nullable: boolean;
};

export type Node = Seq | Expr | Or | Repeat | Symbol;

export type Seq = NodeBase & {
  kind: Kind.SEQ;
  children: Node[];
};

export type Symbol = NodeBase & {
  kind: Kind.SYMBOL;
  ref: string;
};

export type Repeat = NodeBase & {
  kind: Kind.REPEAT;
  pattern: Node;
};

export type Or = NodeBase & {
  kind: Kind.OR;
  patterns: Array<Seq | Expr | Symbol>;
};

export type Expr = NodeBase & {
  kind: Kind.EXPR;
  expr: string;
};

type Cache = { [key: `${string}@${number}`]: ParseSuccess };
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
  matchAll: boolean;
  cache: SeqCacheApi;
  pos: number;
};

type RecParser = (input: string, opts?: ParseOption) => ParseResult;

export type Parser<In = any, Out = any> = (
  input: In,
  opts?: {
    cursor?: number;
    matchAll?: boolean;
    cache?: SeqCacheApi;
  }
) => Out;

type SymbolMap = { [key: string]: RecParser | void };
export function createContext() {
  const symbolMap: SymbolMap = {};
  const toNode = (node: NodeOrExprString): Node =>
    typeof node === "string" ? createExpr(node) : node;
  let cnt = 0;
  const genId = () => (cnt++).toString();
  const exprCache: { [key: string]: Expr } = {};

  function compile(node: Node): Parser {
    const parse = compileRec(node, { symbolMap, root: node.id });

    return (input: string, opts: Partial<ParseOption> = {}) => {
      return parse(input, {
        cache: createCache(),
        matchAll: false,
        pos: 0,
        ...opts,
      });
    };
  }

  function defineSymbol(
    refId: string | void,
    node: NodeOrExprString,
    reshape: Parser = defaultReshape
  ): Symbol {
    const id = refId || genId();
    symbolMap[id] = () => {
      throw new Error("Override me");
    };
    const parser = compile(toNode(node));
    symbolMap[id] = parser;
    return createRef(id, reshape);
  }

  function createRef(refId: string, reshape: Parser = defaultReshape): Symbol {
    return {
      id: "symbol:" + genId(),
      kind: Kind.SYMBOL,
      ref: refId,
      reshape,
      key: undefined,
      nullable: false,
    };
  }

  function createSeq(
    children: NodeOrExprString[],
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
        child.kind === Kind.EXPR &&
        child.reshape === defaultReshape &&
        child.key == null
      ) {
        currentExprs.push(child.expr);
      } else {
        if (currentExprs.length > 0) {
          nodes.push(createExpr(currentExprs.join("")));
          currentExprs = [];
        }
        nodes.push(child);
      }
    });
    nodes.push(createExpr(currentExprs.join("")));
    return {
      id: "seq:" + genId(),
      kind: Kind.SEQ,
      children: nodes,
      reshape,
      key: undefined,
      nullable: false,
    };
  }

  function createOr(
    patterns: Array<Seq | Expr | Symbol | Or | string>,
    reshape: Parser = defaultReshape
  ): Or {
    return {
      kind: Kind.OR,
      patterns: patterns.map(toNode) as Array<Seq | Expr | Symbol>,
      key: undefined,
      reshape,
      id: "or:" + genId(),
      nullable: false,
    };
  }

  function createRepeat(
    pattern: NodeOrExprString,
    reshape: Parser<any, any> = defaultReshape
  ): Repeat {
    return {
      id: "repeat:" + genId(),
      kind: Kind.REPEAT,
      pattern: toNode(pattern),
      reshape,
      key: undefined,
      nullable: false,
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
      id: `expr:${expr}`,
      kind: Kind.EXPR,
      expr,
      reshape,
      key: undefined,
      nullable: false,
    });
  }

  const builder = {
    def: defineSymbol,
    ref: createRef,
    expr: createExpr,
    repeat: createRepeat,
    or: createOr,
    seq: createSeq,
    nullable<T extends Node>(node: T | string): T {
      return { ...(toNode(node) as T), nullable: true };
    },
    param<T extends Node>(key: string, node: T | string): T {
      return { ...(toNode(node) as T), key };
    },
    join(...expr: string[]): Expr {
      return createExpr(expr.join(""));
    },
  };

  return { symbolMap, builder, compile };
}

export function compileRec(
  node: Node,
  opts: { symbolMap: SymbolMap; root: Node["id"] }
): RecParser {
  console.log("[compiling...]", node.id);
  // const existsParentCache = !!cache;
  const reshape = node.reshape;
  switch (node.kind) {
    case Kind.SYMBOL: {
      return (input, parseOpts) => {
        const resolved = opts.symbolMap[node.ref];
        if (!resolved) {
          throw new Error(`symbol not found: ${node.ref}`);
        }
        return resolved(input, parseOpts);
      };
    }
    case Kind.EXPR: {
      const re = new RegExp(`^${node.expr}`, "m");
      return (input: string, { cache, pos }) => {
        const cached = cache.get(node.id, pos);
        if (cached) return cached;
        const m = re.exec(input);
        if (m == null) {
          if (node.nullable) {
            return {
              result: null,
              len: 0,
              pos: pos,
            };
          }
          return {
            error: true,
            pos: pos,
            errorType: "Expr:Unmatch",
            detail: `"${input}" does not fill: ${node.expr}`,
          };
        }
        const target = m[0];
        const ret = {
          result: reshape(target),
          len: target.length,
        };
        cache.add(node.id, pos, ret);
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
      return (input: string, { cache, matchAll, pos }) => {
        const errors: ParseError[] = [];
        for (const next of compiledPatterns) {
          let parsed = cache.get(next.node.id, pos) as ParseResult;
          if (parsed == null) {
            parsed = next.parse(input, { cache, matchAll, pos });
            cache.add(next.node.id, pos, parsed);
          }
          if (parsed.error === true) {
            if (node.nullable) {
              return {
                result: null,
                len: 0,
                pos: pos,
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
          pos: pos,
          errorType: "Or:UnmatchAll",
          detail: `"${input}" does not match any pattern`,
          children: errors,
        } as ParseError;
      };
    }
    case Kind.REPEAT: {
      const parser = compileRec(node.pattern, opts);
      return (input: string, opts) => {
        const xs: string[] = [];
        let len = 0;
        while (input.length > 0) {
          const match = parser(input, { ...opts, pos: opts.pos + len });
          if (match.error === true) break;
          xs.push(match.result);
          len += match.len;
          input = input.slice(match.len);
        }
        return {
          result: xs.map(reshape as any),
          len: len,
          pos: opts.pos,
        };
      };
    }
    case Kind.SEQ: {
      const parsers = node.children.map((c) => {
        const parse = compileRec(c, opts);
        return { parse, node: c };
      });
      return (input: string = "", opts) => {
        const originalInput = input.slice();
        const result: any = {};
        // let pos = opts.pos;
        let len = 0;
        let isObject = false;
        for (const parser of parsers) {
          const match = (opts.cache.get(parser.node.id, opts.pos + len) ??
            parser.parse(input, {
              ...opts,
              pos: opts.pos + len,
            })) as ParseResult;
          if (match.error !== true) {
            input = input.slice(match.len);
            opts.cache.add(parser.node.id, opts.pos + len, match);
            len += match.len;
            if (parser.node.key) {
              const reshaped = match.result;
              result[parser.node.key] = reshaped;
              isObject = true;
            }
          } else {
            return {
              error: true,
              errorType: "Seq:Stop",
              pos: opts.pos,
              child: match,
            };
          }
        }
        if (opts.matchAll) {
          return {
            error: true,
            errorType: "Seq:NotMatchAll",
            pos: opts.pos + len,
            detail: "Does not match all input",
          };
        }
        const ret = isObject ? result : originalInput.slice(0, len);
        return { result: node.reshape(ret), len: len, pos: opts.pos };
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

if (process.env.NODE_ENV === "test") {
  test("named", () => {
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
    assert.deepStrictEqual(parser("((1)", { matchAll: true }).error, true);
    assert.deepStrictEqual(parser("((1)))", { matchAll: true }).error, true);
  });

  test("json expression", () => {
    const { compile, builder: $ } = createContext();
    const _ = $.def("_", "\\s*");
    // const ident = $.def("ident", "\\w+");
    const stringLiteral = $.def("stringLiteral", `"[^"]"`);
    const numberLiteral = $.def("numberLiteral", `[0-9]|[1-9][0-9]*`);
    const booleanLiteral = $.def("booleanLiteral", `true|false`);
    const nullLiteral = $.def("nullLiteral", `null`);
    const arrayLiteral = $.def(
      "arrayLiteral",
      $.or([
        $.seq(
          [
            "\\[",
            _,
            $.param("head", $.ref("anyLiteral")),
            _,
            $.param(
              "tail",
              $.repeat(
                $.seq([
                  // , item
                  _,
                  ",",
                  _,
                  $.param("item", $.ref("anyLiteral")),
                ]),
                (input) => {
                  // throw input;
                  return input.item;
                }
              )
            ),
            _,
            "\\]",
          ],
          ({ head, tail }) => {
            return {
              type: "array",
              values: [head, ...tail],
            };
          }
        ),
        $.seq(["\\[", _, "\\]"], () => ({ type: "array", values: [] })),
      ])
    );

    // key: val
    const objectKeyPair = $.def(
      "keypair",
      $.seq([
        _,
        // key: value
        $.param("key", stringLiteral),
        _,
        "\\:",
        _,
        $.param("value", $.ref("anyLiteral")),
      ])
    );
    // ref by key
    const objectLiteral = $.def(
      "objectLiteral",
      $.or([
        $.seq(
          [
            "\\{",
            _,
            $.param("head", objectKeyPair),
            $.param(
              "tail",
              $.repeat(
                $.seq([_, ",", $.param("item", objectKeyPair)]),
                (input) => input.item
              )
            ),
            _,
            "\\}",
          ],
          (input) => {
            return {
              type: "object",
              values: [input.head, ...input.tail],
            };
          }
        ),
        $.seq(["\\{", _, "\\}"], () => ({ type: "object", values: [] })),
      ])
    );

    const anyLiteral = $.def(
      "anyLiteral",
      $.or([
        objectLiteral,
        arrayLiteral,
        stringLiteral,
        numberLiteral,
        booleanLiteral,
        nullLiteral,
      ])
    );

    // test array
    const parseArray = compile(arrayLiteral);
    assert.deepStrictEqual(parseArray("[1]").result, {
      type: "array",
      values: ["1"],
    });

    assert.deepStrictEqual(parseArray("[1,2, {}]").result, {
      type: "array",
      values: ["1", "2", { type: "object", values: [] }],
    });

    // test as literal
    const parseExpression = compile(anyLiteral);
    assert.deepStrictEqual(
      parseExpression(`{  "a" : "1", "b": "2", "c" : true, "d": null }`).result,
      {
        type: "object",
        values: [
          {
            key: '"a"',
            value: '"1"',
          },
          {
            key: '"b"',
            value: '"2"',
          },
          {
            key: '"c"',
            value: "true",
          },
          {
            key: '"d"',
            value: "null",
          },
        ],
      }
    );
    // const now = Date.now();
    const jsonText = `{  "a": { "b": "2" }, "c": {}, "d": [1], "e": [{} ] }`;
    assert.deepStrictEqual(parseExpression(jsonText).result, {
      type: "object",
      values: [
        {
          key: '"a"',
          value: {
            type: "object",
            values: [
              {
                key: '"b"',
                value: '"2"',
              },
            ],
          },
        },
        {
          key: '"c"',
          value: {
            type: "object",
            values: [],
          },
        },
        {
          key: '"d"',
          value: {
            type: "array",
            values: ["1"],
          },
        },
        {
          key: '"e"',
          value: {
            type: "array",
            values: [{ type: "object", values: [] }],
          },
        },
      ],
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
      pos: 0,
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

  // cancelAll();

  test("repeat", () => {
    const { compile, builder: $ } = createContext();
    const seq = $.repeat($.seq([$.param("a", "x"), $.param("b", "y")]));
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
    const seq = $.repeat($.seq([$.param("a", "x"), $.param("b", "y")]));
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

  test("or", () => {
    const { compile, builder: $ } = createContext();

    const seq = $.or([$.expr("x"), $.expr("y")]);
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
    const seq = $.or([
      $.seq([$.expr("x"), $.expr("y"), $.expr("z")]),
      $.seq([$.expr("x"), $.expr("y"), $.expr("a")]),
    ]);
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

  run({ stopOnFail: true, stub: true });
}
