import type {
  ParseContext,
  ParseResult,
  RootCompiler,
  RootParser,
  Snapshot,
} from "./types";
import { parseWithCache, success } from "./runtime";

export function createSnapshot(refId: number): Snapshot {
  const entryRefId = $def(() => $seq([toNode(refId), $eof()]));
  const snapshot = compileSnapshot();
  snapshot[E_entryRefId] = entryRefId;
  return snapshot;
}

export function createContext(
  funcs: Function[] = [],
  prebuiltSnapshot?: Snapshot,
) {
  const rootCompiler: RootCompiler = (rule) => {
    const snapshot = prebuiltSnapshot ?? createSnapshot(rule as number);
    const rootParser: RootParser = (tokens: string[], opts: any) => {
      const cache = new Map<string, ParseResult>();
      // console.log("rootParser", tokens, opts);
      const ctx = {
        t: tokens,
        currentError: null,
        cache,
        funcs,
        opts,
        ...snapshot,
      } as ParseContext;
      const rootResult = parseWithCache(ctx, 0, ctx[E_refs][snapshot[0]]);
      if (rootResult.error && ctx.currentError) {
        return { ...ctx.currentError, tokens } as any;
      }
      return rootResult;
    };
    return rootParser;
  };
  return rootCompiler;
}

export function createParserWithSnapshot(
  funcs: Function[],
  snapshot: Snapshot,
) {
  const rootParser: RootParser = (tokens: string[], opts: any) => {
    const cache = new Map<string, ParseResult>();
    const ctx = {
      t: tokens,
      currentError: null,
      cache,
      funcs,
      opts,
      ...snapshot,
    } as ParseContext;
    const rootResult = parseWithCache(
      ctx,
      0,
      ctx[E_refs][snapshot[E_entryRefId]],
    );
    if (rootResult.error && ctx.currentError) {
      return { ...ctx.currentError, tokens } as any;
    }
    return rootResult;
  };
  return rootParser;
}

/* Test */
import {
  $any,
  $atom,
  $def,
  $eof,
  $not,
  $opt,
  $or,
  $ref,
  $regex,
  $repeat,
  $repeat_seq,
  $seq,
  $seqo,
  $skip,
  $skip_opt,
  $token,
  compileSnapshot,
  toNode,
} from "./builder";
import {
  CODE_SEQ_STOP,
  CODE_SEQ_UNMATCH_STACK,
  CODE_TOKEN_UNMATCH,
  E_entryRefId,
  E_refs,
} from "./constants";

import { is } from "@mizchi/test";
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const _buildTokens = (tokens: string[], xs: any[]) => {
    return xs
      .map((t) => {
        if (typeof t === "number") {
          return tokens[t];
        } else {
          return t;
        }
      })
      .join("");
  };

  const expectSuccess = (
    parse: RootParser,
    tokens: string[],
    expected: string,
  ) => {
    const parsed = parse(tokens);
    if (parsed.error) {
      console.error(parsed);
      throw new Error("Expect Parse Success");
    }
    // @ts-ignore
    const tokenString = _buildTokens(tokens, parsed.xs);
    expect(tokenString, expected);
  };

  const expectSuccessSeqObject = (
    parse: RootParser,
    tokens: string[],
    expected: any,
  ) => {
    const parsed = parse(tokens);
    if (parsed.error) {
      throw new Error("Expect Parse Success");
    }
    const obj = parsed.xs[0];
    const result = Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        return [k, _buildTokens(tokens, v as any)];
      }),
    );
    expect(result, expected);
  };

  const expectFail = (parse: RootParser, tokens: string[]) => {
    const parsed = parse(tokens);
    if (!parsed.error) {
      throw new Error(
        `Expect Parse Fail but success: ${_buildTokens(tokens, parsed.xs)}`,
      );
    }
  };

  // const is = assert.deepEqual;

  // const is = (a: any, b: any) => {
  // 	expect(a).toContainEqual(b);
  // 	// expect(a).to.toContainEqual(b);
  // };

  test("eof", () => {
    const compile = createContext();
    const parse = compile($seq([$eof(), $eof()]));
    is(parse([]), {
      error: false,
      len: 0,
      pos: 0,
      xs: [],
    });
    // is(parse(["a"]), { error: true });
  });

  test("any", () => {
    const compile = createContext([dummyFn, () => "x", () => " "]);
    const parse = compile($any());
    is(parse(["a"]), { xs: [0] });
    const parseNull = compile($any(0));
    is(parseNull([]), { xs: [] });
    const parseNull2 = compile($seq([$any(1), $any(0, 1)]));
    is(parseNull2(["a"]), { xs: [0, "x"] });

    const parseWhitespace = compile($any(0, 2));
    is(parseWhitespace([]), { xs: [" "] });

    const parseTwo = compile($any(2));
    is(parseTwo(["a", "b"]), { xs: [0, 1] });
  });

  test("token", () => {
    const compile = createContext();
    const parse = compile($token("a"));
    is(parse(["a"]), { xs: [0] });
    expectSuccess(parse, ["a"], "a");
    expectFail(parse, ["b"]);
  });

  const dummyFn = () => {};
  test("token with reshaped", () => {
    const funcs = [dummyFn, (token: any) => token + "_mod"];
    const compile = createContext(funcs);
    const parse = compile($token("a", 1));
    is(parse(["a"]), { xs: ["a_mod"] });
  });

  test("token: multibyte", () => {
    const compile = createContext();
    const parse = compile($token("あ"));
    expectSuccess(parse, ["あ"], "あ");
    is(parse([""]), { error: true });
  });

  test("token: multi chars", () => {
    const compile = createContext();
    const parse = compile($token("xxx"));
    expectSuccess(parse, ["xxx"], "xxx");
  });

  test("regex", () => {
    const compile = createContext();
    const parse = compile($regex(`^\\w+$`));
    expectSuccess(parse, ["abc"], "abc");
    expectFail(parse, [""]);
    const parse2 = compile($regex(`^a$`));
    expectFail(parse2, ["xa"]);
    expectSuccess(parse2, ["a"], "a");
  });

  test("regex with reshape", () => {
    const compile = createContext([dummyFn, (token: string) => token + "_mod"]);
    const parse = compile($regex(`^\\w+$`, 1));
    expectSuccess(parse, ["abc"], "abc_mod");
    expectFail(parse, [""]);
  });

  test("seq", () => {
    const compile = createContext();
    const parser = compile($seq(["a", "b"]));
    expectSuccess(parser, ["a", "b"], "ab");
    expectFail(parser, ["a"]);
    expectFail(parser, ["a", "a"]);
    expectFail(parser, ["b"]);
  });

  test("seq with eof", () => {
    const compile = createContext();
    const parse = compile($seq(["a"]));
    expectFail(parse, []);
    expectSuccess(parse, ["a"], "a");
    expectFail(parse, ["a", "b"]);
  });

  test("seq with not", () => {
    const compile = createContext();
    const parser = compile($seq(["a", $not(["b"]), "c"]));
    expectSuccess(parser, ["a", "c"], "ac");
    expectFail(parser, ["a", "c", "d"]);
    expectFail(parser, ["a"]);
    expectFail(parser, ["a", "a"]);
    expectFail(parser, ["b"]);
  });

  test("seq nested", () => {
    const compile = createContext();
    const parser = compile($seq(["a", $seq(["b", "c"])]));
    expectSuccess(parser, ["a", "b", "c"], "abc");
  });

  test("seq reshape", () => {
    const compile = createContext([
      dummyFn,
      (xs: any[]) => {
        return xs.map((i) => i + ".");
      },
    ]);
    const parser = compile($seq(["a", "b"], 1));
    expectSuccess(parser, ["a", "b"], "a.b.");
  });

  test("seqo", () => {
    const compile = createContext();
    const parser = compile(
      $seqo([
        ["a", "x"],
        ["b", "y"],
      ]),
    );
    expectSuccessSeqObject(parser, ["x", "y"], {
      a: "x",
      b: "y",
    });
    expectFail(parser, ["x", "z"]);
    expectFail(parser, " xy".split(""));
  });

  test("seqo shorthand", () => {
    const compile = createContext();
    const parser = compile(
      $seqo([
        ["a", "x"],
        [{ key: "b" }, "y"],
      ]),
    );
    expectSuccessSeqObject(parser, ["x", "y"], {
      a: "x",
      b: "y",
    });
  });

  test("seq:skip", () => {
    const compile = createContext();
    const parser = compile($seq([$skip("x")]));
    expectSuccess(parser, ["x"], "");
    const parser2 = compile($seq(["a", $skip("x")]));
    expectSuccess(parser2, ["a", "x"], "a");
    // is(parser(["a", "b"]), {
    //   error: true,
    //   code: CODE_SEQ_STOP,
    //   childError: { code: CODE_TOKEN_UNMATCH },
    // });
  });

  test("seq:skip_opt", () => {
    const compile = createContext();
    const parser = compile($seq(["a", $skip_opt("x"), "b"]));
    expectSuccess(parser, ["a", "x", "b"], "ab");
    expectSuccess(parser, ["a", "b"], "ab");
  });

  test("repeat", () => {
    const compile = createContext();
    const parse = compile($repeat("a"));
    // expectSuccess(parse, [], "");
    expectSuccess(parse, ["a"], "a");
    expectSuccess(parse, ["a", "a", "a"], "aaa");
    // expectSuccess(parse, ["b"], "");
  });

  test("repeat_reshape", () => {
    const compile = createContext([
      () => {},
      ([a]: [string]) => a + "x",
      (xs: any) => {
        return xs.join("") + "-end";
      },
    ]);
    const parse = compile($repeat<string, string, string[]>($token("a"), 1));
    expectSuccess(parse, [], "");
    expectSuccess(parse, ["a"], "ax");
    expectSuccess(parse, ["a", "a"], "axax");

    const parseWithTransResult = compile(
      $repeat<string, string, any>($token("a"), 1, 2),
    );
    expectSuccess(parseWithTransResult, ["a", "a"], "axax-end");
  });

  test("repeat_seq", () => {
    const compile = createContext();
    const parse = compile($repeat_seq(["xy"]));
    expectSuccess(parse, ["xy"], "xy");
    expectSuccess(parse, ["xy", "xy"], "xyxy");
    expectFail(parse, ["xz", "xy"]);
    expectFail(parse, ["xy", "xz"]);
  });

  test("seqo with param", () => {
    const compile = createContext();
    const parser = compile($seqo([["a", "a"]]));
    is(parser(["a"]), { xs: [{ a: ["a"] }], pos: 0 });
    expectSuccessSeqObject(parser, ["a"], { a: "a" });

    is(parser(["x"]), {
      pos: 0,
      error: true,
      detail: [CODE_SEQ_STOP],
      // TODO: fix
      // childError: {
      //   code: CODE_TOKEN_UNMATCH,
      // },
    });
  });

  test("reuse symbol", () => {
    const compile = createContext();
    const seq = $seq(["a", "b", "c"]);
    const parser = compile(seq);
    expectSuccess(parser, ["a", "b", "c"], "abc");
  });

  test("or", () => {
    const compile = createContext();
    const seq = $or(["x", "y"]);
    const parser = compile(seq);
    expectSuccess(parser, ["x"], "x");
    expectSuccess(parser, ["y"], "y");
    // @ts-ignore
    is(parser(["z"]), {
      // {
      error: true,
      pos: 0,
      detail: [
        5,
        0,
        {
          error: true,
          pos: 0,
          detail: [
            9,
            [
              {
                error: true,
                pos: 0,
                detail: [3, "x", "z"],
              },
              {
                error: true,
                pos: 0,
                detail: [3, "y", "z"],
              },
            ],
          ],
        },
      ],
      tokens: ["z"],
      // }
      // detail: [

      // ],
      // error: true,
      // detail: [CODE_OR_UNMATCH_ALL],
      // pos: 0,
      // errors: [
      //   [
      //     // error: true,
      //     CODE_TOKEN_UNMATCH,
      //     0,
      //   ],
      //   [CODE_TOKEN_UNMATCH, 0],
      // ],
      // ]
    });
  });

  test("or:with-cache", () => {
    const compile = createContext();
    const seq = $or([$seq(["x", "y", "z"]), $seq(["x", "y", "a"])]);
    const parser = compile(seq);
    expectSuccess(parser, ["x", "y", "a"], "xya");
    expectSuccess(parser, ["x", "y", "z"], "xyz");
    is(parser(["x", "y", "b"]), {
      error: true,
      pos: 2,
      detail: [
        CODE_SEQ_STOP,
        2,
        {
          error: true,
          detail: [CODE_TOKEN_UNMATCH, "a", "b"],
        },
      ],
      // code: ,
      // childError: {
      //   error: true,
      //   detail: [CODE_TOKEN_UNMATCH],
      // },
    });
  });

  test("ref", () => {
    const compile = createContext();
    const paren = $def(() =>
      $seq([
        "(",
        $or([
          // nested: ((1))
          $ref(paren),
          // (1),
          "1",
        ]),
        ")",
      ]),
    );
    const parser = compile(paren);
    expectSuccess(parser, "(1)".split(""), "(1)");
    expectSuccess(parser, "((1))".split(""), "((1))");
    expectFail(parser, "((1)".split(""));
    expectFail(parser, "(1))".split(""));
  });

  test("skip in or", () => {
    const compile = createContext();
    const parser = compile($or([$seq(["a", $skip("b"), "c"]), "xxx"]));
    expectSuccess(parser, "abc".split(""), "ac");
  });

  test("skip in repeat", () => {
    const compile = createContext();
    const parser = compile(
      $seq([
        // seq
        $repeat($or([$seq(["a", $skip("b"), "c"]), "x"])),
      ]),
    );
    expectSuccess(parser, "abcabcxxx".split(""), "acacxxx");
    expectFail(parser, "abcz".split(""));
  });

  test("seq-string with reshape", () => {
    const compile = createContext([dummyFn, () => "_"]);
    const parser = compile(
      $seq([
        //
        "a",
        $seq(["b"], 1),
        $skip("c"),
        "d",
      ]),
    );
    expectSuccess(parser, "abcd".split(""), "a_d");
    is(parser("abbd".split("")), { error: true });
  });

  test("seq:skip-nested", () => {
    const compile = createContext();
    const parser = compile($seq(["a", $seq([$skip("b"), "c"])]));
    expectSuccess(parser, "abc".split(""), "ac");
  });

  test("seq:skip-nested2", () => {
    const compile = createContext();
    const parser = compile($or([$seq([$skip("b")])]));
    expectSuccess(parser, ["b"], "");
  });

  test("seq:skip-nested3-optional", () => {
    const compile = createContext();
    const parser = compile($or([$seq([$skip_opt("b")])]));
    expectSuccess(parser, ["b"], "");
    expectSuccess(parser, [], "");
  });

  test("skip with repeat", () => {
    const compile = createContext();
    const parser = compile($seq([$repeat_seq(["a", $skip("b")])]));
    expectSuccess(parser, "ababab".split(""), "aaa");
  });

  test("opt with repeat", () => {
    const compile = createContext();
    const parser = compile($repeat_seq([$opt("a"), $skip("b")]));
    expectSuccess(parser, "abbab".split(""), "aa");
  });

  test("seq-o paired close", () => {
    const compile = createContext([
      dummyFn,
      ([a]: number[], [b]: number[], ctx: ParseContext) =>
        ctx.t[a] === ctx.t[b],
    ]);
    const parser = compile(
      $seqo([
        [{ key: "key", push: true }, $or(["x", "y"])],
        [
          {
            pop: 1,
          },
          $or(["x", "y"]),
        ],
      ]),
    );
    is(parser(["x", "x"]), {
      xs: [{ key: ["x"] }],
    });
    is(parser(["y", "y"]), {
      xs: [{ key: ["y"] }],
    });
    is(parser(["x", "y"]), {
      error: true,
      detail: [CODE_SEQ_UNMATCH_STACK],
    });
  });

  test("paired close: like jsx", () => {
    const compile = createContext([
      dummyFn,
      ([a]: number[], [b]: number[], ctx: ParseContext) => {
        return ctx.t[a] === ctx.t[b];
      },
    ]);
    const parser = compile(
      $seqo([
        "<",
        [{ key: "key", push: true }, $regex(`^[a-z]+$`)],
        ">",
        [{ key: "value" }, $regex(`^[a-z]+$`)],
        "<",
        "/",
        [{ pop: 1 }, $regex(`^[a-z]+$`)],
        ">",
      ]),
    );
    is(parser(["<", "div", ">", "x", "<", "/", "div", ">"]), {
      xs: [{ key: ["div"], value: ["x"] }],
    });
    is(parser(["<", "div", ">", "x", "<", "/", "a", ">"]), {
      error: true,
      // detail: [CODE_SEQ_UNMATCH_STACK],
    });
  });
  test("paired close: like jsx nested", () => {
    const compile = createContext([
      dummyFn,
      ([a]: number[], [b]: number[], ctx: ParseContext) => {
        return ctx.t[a] === ctx.t[b];
      },
    ]);
    const parser = compile(
      $seqo([
        "<",
        [{ key: "tag1", push: true }, $regex("[a-z]+")],
        ">",
        "<",
        [{ key: "tag2", push: true }, $regex("[a-z]+")],
        ">",
        "<",
        "/",
        [{ pop: 1 }, $regex("[a-z]+")],
        ">",
        "<",
        "/",
        [{ pop: 1 }, $regex("[a-z]+")],
        ">",
      ]),
    );
    is(
      parser([
        "<",
        "div",
        ">",
        "<",
        "a",
        ">",
        "<",
        "/",
        "a",
        ">",
        "<",
        "/",
        "div",
        ">",
      ]),
      {
        xs: [{ tag1: ["div"], tag2: ["a"] }],
      },
    );

    is(
      parser([
        "<",
        "div",
        ">",
        "<",
        "a",
        ">",
        "<",
        "/",
        "div",
        ">",
        "<",
        "/",
        "div",
        ">",
      ]),
      {
        error: true,
        // detail: [CODE_SEQ_UNMATCH_STACK],
      },
    );
  });

  test("atom: jsx string", () => {
    const compile = createContext([
      dummyFn,
      (ctx: ParseContext, pos: number) => {
        let i = 0;
        const xs: string[] = [];
        while (i < ctx.t.length) {
          const token = ctx.t[pos + i];
          if ([">", "<", "{"].includes(token)) {
            break;
          }
          xs.push(token);
          i++;
        }
        return success(pos, i, [xs.join(" ")]);
      },
    ]);
    const parser = compile($seq(["<", $atom(1), ">"]));
    const ret = parser(["<", "ab", "cd", ">"]);
    is(ret, {
      error: false,
      pos: 0,
      len: 4,
      xs: [0, "ab cd", 3],
    });
  });
}
