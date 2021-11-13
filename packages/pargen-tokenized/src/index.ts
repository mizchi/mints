// import { createParseSuccess } from "./../../pargen/src/compiler";
import {
  ERROR_Or_UnmatchAll,
  ERROR_Repeat_RangeError,
  ERROR_Seq_UnmatchStack,
} from "./types";
import { compileFragment, fail, success } from "./runtime";
import {
  CacheMap,
  Compiler,
  EOF,
  ERROR_Eof_Unmatch,
  ERROR_Seq_Stop,
  ERROR_Token_Unmatch,
  PackratCache,
  ParseResult,
  RootCompiler,
  RootParser,
  SEQ,
  Seq,
} from "./types";

const isNumber = (x: any): x is number => typeof x === "number";

export function createContext(partial: Partial<Compiler> = {}) {
  const compiler: Compiler = {
    data: {},
    // useHeadTables: false,
    parsers: new Map(),
    definitions: new Map(),
    ...partial,
  };

  const rootCompiler: RootCompiler = (node, rootOpts) => {
    $close(compiler);
    const end = rootOpts?.end ?? false;
    const _resolved = isNumber(node) ? createRef(node) : node;
    const resolved = end
      ? ({
          id: 0, // shoud be zero
          kind: SEQ,
          primitive: true,
          children: [
            _resolved,
            {
              id: 1,
              kind: EOF,
              primitive: true,
            },
          ],
        } as Seq)
      : _resolved;
    const parseFromRoot = compileFragment(resolved, compiler, resolved.id);
    const rootParser: RootParser = (tokens: string[]) => {
      const cache = createPackratCache();
      const rootResult = parseFromRoot(
        {
          root: resolved.id,
          tokens,
          currentError: null,
          cache,
        },
        0
      );
      return rootResult;
    };
    return rootParser;
  };
  return {
    compile: rootCompiler,
    compiler,
  };
}

// impl
function createPackratCache(): PackratCache {
  const cache: CacheMap = {};
  const keygen = (id: number, pos: number): `${number}@${string}` =>
    `${pos}@${id}`;
  function add(id: number, pos: number, result: ParseResult) {
    // @ts-ignore
    cache[keygen(id, pos)] = result;
  }
  function get(id: number, pos: number): ParseResult | void {
    const key = keygen(id, pos);
    return cache[key];
  }
  const getOrCreate = (
    id: number | string,
    pos: number,
    creator: () => ParseResult
  ): ParseResult => {
    // return measurePerf("c-" + id, () => {
    const cached = get(id as number, pos);
    if (cached) {
      cacheHitCount++;
      return cached;
    }
    cacheMissCount++;
    const result = creator();
    add(id as number, pos, result);
    return result;
    // });
  };
  return {
    add,
    get,
    getOrCreate,
  };
}

const perfTimes = new Map<string, { sum: number; count: number }>();
let cacheHitCount = 0;
let cacheMissCount = 0;
// const addPerfTime = (id: string, time: number) => {
//   const prev = perfTimes.get(id);
//   if (prev) {
//     perfTimes.set(id, { sum: prev.sum + time, count: prev.count + 1 });
//   } else {
//     perfTimes.set(id, { sum: time, count: 1 });
//   }
// };

// const measurePerf = <Fn extends (...args: any[]) => any>(
//   id: string,
//   fn: Fn
// ): ReturnType<Fn> => {
//   if (process.env.NODE_ENV === "perf") {
//     // const start = Date.now();
//     // const ret = fn();
//     // addPerfTime(id, Date.now() - start);
//     const start = process.hrtime.bigint();
//     const ret = fn();
//     addPerfTime(id, Number(process.hrtime.bigint() - start));
//     return ret;
//   }
//   return fn();
// };

export const printPerfResult = () => {
  if (process.env.NODE_ENV === "perf") {
    console.log("========= perf ============");
    console.log("cache hit", cacheHitCount, "cache miss", cacheMissCount);
    const ts = [...perfTimes.entries()].sort((a, b) => b[1].sum - a[1].sum);
    for (const [id, ret] of ts) {
      // over 30ms
      if (ret.sum > 30_000_000) {
        console.log(
          `[${id}] total:${Math.floor(ret.sum / 1_000_000)}ms ref_count:${
            ret.count
          }`
        );
      }
    }
  }
};

/* Test */
import { is, run, test } from "@mizchi/test";
import {
  $any,
  $atom,
  $close,
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
  createRef,
} from "./builder";
if (process.env.NODE_ENV === "test" && require.main === module) {
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
    expected: string
  ) => {
    const parsed = parse(tokens);
    if (parsed.error) {
      throw new Error("Expect Parse Success");
    }
    // @ts-ignore
    const tokenString = _buildTokens(tokens, parsed.results);
    is(tokenString, expected);
  };

  const expectSuccessSeqObject = (
    parse: RootParser,
    tokens: string[],
    expected: any
  ) => {
    const parsed = parse(tokens);
    if (parsed.error) {
      throw new Error("Expect Parse Success");
    }
    const obj = parsed.results[0];
    const result = Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        return [k, _buildTokens(tokens, v as any)];
      })
    );
    is(result, expected);
  };

  const expectFail = (parse: RootParser, tokens: string[]) => {
    const parsed = parse(tokens);
    if (!parsed.error) {
      throw new Error(
        `Expect Parse Fail but success: ${_buildTokens(tokens, parsed.results)}`
      );
    }
  };

  test("eof", () => {
    const { compile } = createContext();
    const parse = compile($eof());
    is(parse([]), { results: [] });
    is(parse(["a"]), { error: true, errorType: ERROR_Eof_Unmatch });
  });

  test("any", () => {
    const { compile } = createContext();
    const parse = compile($any());
    is(parse(["a"]), { results: [0] });

    const parseNull = compile($any(0));
    is(parseNull([]), { results: [] });

    const parseNull2 = compile($seq([$any(1), $any(0, () => "x")]));
    is(parseNull2(["a"]), { results: [0, "x"] });

    const parseWhitespace = compile($any(0, () => " "));
    is(parseWhitespace([]), { results: [" "] });

    const parseTwo = compile($any(2));
    is(parseTwo(["a", "b"]), { results: [0, 1] });
  });

  test("token", () => {
    const { compile } = createContext();
    const parse = compile($token("a"));
    is(parse(["a"]), { results: [0] });
    expectSuccess(parse, ["a"], "a");
    expectFail(parse, ["b"]);
  });

  test("token with reshaped", () => {
    const { compile } = createContext();
    const parse = compile($token("a", (token) => token + "_mod"));
    is(parse(["a"]), { results: ["a_mod"] });
  });

  test("token: multibyte", () => {
    const { compile } = createContext();
    const parse = compile($token("あ"));
    // is(parse(["あ"]), { results: ["あ"] });
    expectSuccess(parse, ["あ"], "あ");
    is(parse([""]), { error: true });
  });

  test("token: multi chars", () => {
    const { compile } = createContext();
    const parse = compile($token("xxx"));
    expectSuccess(parse, ["xxx"], "xxx");
  });

  test("regex", () => {
    const { compile } = createContext();
    const parse = compile($regex(/^\w+$/));
    expectSuccess(parse, ["abc"], "abc");
    expectFail(parse, [""]);
    const parse2 = compile($regex(/^a$/));
    expectFail(parse2, ["xa"]);
    expectSuccess(parse2, ["a"], "a");
  });

  test("regex with reshape", () => {
    const { compile } = createContext();
    const parse = compile($regex(/^\w+$/, (token) => token + "_mod"));
    expectSuccess(parse, ["abc"], "abc_mod");
    expectFail(parse, [""]);
  });

  test("not", () => {
    const { compile } = createContext();
    const parse = compile($not(["a"]));
    expectFail(parse, ["a"]);
    expectSuccess(parse, ["b"], "");
    const parseMultiNot = compile($not(["a", "b"]));
    expectFail(parseMultiNot, ["a"]);
    expectFail(parseMultiNot, ["b"]);
    expectSuccess(parseMultiNot, ["c"], "");
  });

  test("seq", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", "b"]));
    expectSuccess(parser, ["a", "b"], "ab");
    expectFail(parser, ["a"]);
    expectFail(parser, ["a", "a"]);
    expectFail(parser, ["b"]);
  });

  test("seq with eof", () => {
    const { compile } = createContext();
    const parse = compile($seq(["a", $eof()]));
    expectFail(parse, []);
    expectSuccess(parse, ["a"], "a");
    expectFail(parse, ["a", "b"]);
  });

  test("seq with not", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $not(["b"]), "c", $eof()]));
    expectSuccess(parser, ["a", "c"], "ac");
    expectFail(parser, ["a", "c", "d"]);
    expectFail(parser, ["a"]);
    expectFail(parser, ["a", "a"]);
    expectFail(parser, ["b"]);
  });

  test("seq nested", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $seq(["b", "c"])]));
    expectSuccess(parser, ["a", "b", "c"], "abc");
  });

  test("seq reshape", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq(["a", "b", $eof()], (results) => {
        return results.map((i) => i + ".");
      })
    );
    expectSuccess(parser, ["a", "b"], "a.b.");
  });

  test("seqo", () => {
    const { compile } = createContext();
    const parser = compile($seqo([["a", "x"], ["b", "y"], $eof()]));
    expectSuccessSeqObject(parser, ["x", "y"], {
      a: "x",
      b: "y",
    });
    expectFail(parser, ["x", "z"]);
    expectFail(parser, " xy".split(""));
  });

  test("seqo shorthand", () => {
    const { compile } = createContext();
    const parser = compile(
      $seqo([
        ["a", "x"],
        [{ key: "b" }, "y"],
      ])
    );
    expectSuccessSeqObject(parser, ["x", "y"], {
      a: "x",
      b: "y",
    });
  });

  test("seq:skip", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $skip("x"), "b"]));
    expectSuccess(parser, ["a", "x", "b"], "ab");
    is(parser(["a", "b"]), { error: true, index: 1 });
  });

  test("seq:skip_opt", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $skip_opt("x"), "b"]));
    expectSuccess(parser, ["a", "x", "b"], "ab");
    expectSuccess(parser, ["a", "b"], "ab");
  });

  test("repeat", () => {
    const { compile } = createContext();
    const parse = compile($repeat($token("a")));
    expectSuccess(parse, [], "");
    expectSuccess(parse, ["a"], "a");
    expectSuccess(parse, ["a", "a", "a"], "aaa");
    expectSuccess(parse, ["b"], "");
    const parseWithMin = compile($repeat($token("a"), [1, 3]));
    is(parseWithMin([]), { error: true, errorType: ERROR_Repeat_RangeError });
    is(parseWithMin(["a"]), { error: false });
    is(parseWithMin(["a", "a", "a", "a"]), {
      error: true,
      errorType: ERROR_Repeat_RangeError,
    });
  });

  test("repeat_reshape", () => {
    const { compile } = createContext();
    const parse = compile(
      $repeat<string, string, string[]>(
        $token("a"),
        undefined,
        ([a]) => a + "x"
      )
    );
    expectSuccess(parse, [], "");
    expectSuccess(parse, ["a"], "ax");
    expectSuccess(parse, ["a", "a"], "axax");

    const parseWithTransResult = compile(
      $repeat<string, string, any>(
        $token("a"),
        undefined,
        ([a]) => a + "x",
        (results) => {
          return results.join("") + "-end";
        }
      )
    );
    expectSuccess(parseWithTransResult, ["a", "a"], "axax-end");
  });

  test("repeat_seq", () => {
    const { compile } = createContext();
    const parse = compile($repeat_seq(["xy"]));
    expectSuccess(parse, ["xy", "xy"], "xyxy");
    expectSuccess(parse, ["xy", "xz"], "xy");
    expectSuccess(parse, ["xz"], "");
  });

  test("seq with param", () => {
    const { compile } = createContext();
    const seq = $seqo([["a", "a"]]);
    const parser = compile(seq);
    is(parser(["a"]), { results: [{ a: ["a"] }], len: 1, pos: 0 });
    // expectSuccessSeqObject(parser, ["a"], { a: [0] });
    is(parser(["x"]), {
      error: true,
      errorType: ERROR_Seq_Stop,
      pos: 0,
      childError: {
        pos: 0,
        error: true,
        errorType: ERROR_Token_Unmatch,
      },
    });
  });

  test("reuse symbol", () => {
    const { compile } = createContext({});
    const seq = $seq(["a", "b", "c"]);
    const parser = compile(seq);
    expectSuccess(parser, ["a", "b", "c"], "abc");
  });

  test("or", () => {
    const { compile } = createContext();
    const seq = $or(["x", "y"]);
    const parser = compile(seq);
    expectSuccess(parser, ["x"], "x");
    expectSuccess(parser, ["y"], "y");
    is(parser(["z"]), {
      error: true,
      errorType: ERROR_Or_UnmatchAll,
      pos: 0,
      errors: [
        {
          error: true,
          pos: 0,
          errorType: ERROR_Token_Unmatch,
        },
        {
          error: true,
          pos: 0,
          errorType: ERROR_Token_Unmatch,
        },
      ],
      // ]
    });
  });

  test("or:with-cache", () => {
    const { compile } = createContext();
    const seq = $or([$seq(["x", "y", "z"]), $seq(["x", "y", "a"])]);
    const parser = compile(seq);
    expectSuccess(parser, ["x", "y", "a"], "xya");
    expectSuccess(parser, ["x", "y", "z"], "xyz");
    is(parser(["x", "y", "b"]), {
      error: true,
      pos: 0,
      errorType: ERROR_Or_UnmatchAll,
    });
  });

  test("reuse recursive with suffix", () => {
    // const Paren = 1000;
    const { compile } = createContext({});
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
      ])
    );
    const parser = compile(paren, { end: true });
    expectSuccess(parser, "(1)".split(""), "(1)");
    expectSuccess(parser, "((1))".split(""), "((1))");
    expectFail(parser, "((1)".split(""));
    expectFail(parser, "(1))".split(""));
  });

  test("skip in or", () => {
    const { compile } = createContext();
    // read next >
    const parser = compile($or([$seq(["a", $skip("b"), "c"]), "xxx"]));
    expectSuccess(parser, "abc".split(""), "ac");
  });

  test("skip in repeat", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq([
        // seq
        $repeat($or([$seq(["a", $skip("b"), "c"]), "x"])),
        $eof(),
      ])
    );
    expectSuccess(parser, "abcabcxxx".split(""), "acacxxx");
    expectFail(parser, "abcz".split(""));
  });

  test("seq-string with reshape", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq([
        //
        "a",
        $seq(["b"], () => "_"),
        $skip("c"),
        "d",
      ]),
      { end: true }
    );
    expectSuccess(parser, "abcd".split(""), "a_d");
    is(parser("abbd".split("")), { error: true });
  });

  test("seq:skip-nested", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $seq([$skip("b"), "c"])]));
    expectSuccess(parser, "abc".split(""), "ac");
  });

  test("seq:skip-nested2", () => {
    const { compile } = createContext();
    const parser = compile($or([$seq([$skip("b")])]));
    expectSuccess(parser, ["b"], "");
  });

  test("seq:skip-nested3-optional", () => {
    const { compile } = createContext();
    const parser = compile($or([$seq([$skip_opt("b")])]));
    expectSuccess(parser, ["b"], "");
    expectSuccess(parser, [""], "");
  });

  test("skip with repeat", () => {
    const { compile } = createContext();
    const parser = compile($seq([$repeat_seq(["a", $skip("b")])]));
    expectSuccess(parser, "ababab".split(""), "aaa");
  });

  test("opt with repeat", () => {
    const { compile } = createContext();
    const parser = compile($repeat_seq([$opt("a"), $skip("b")]));
    expectSuccess(parser, "abbab".split(""), "aa");
  });

  test("seq-o paired close", () => {
    const { compile } = createContext();
    const parser = compile(
      $seqo([
        [{ key: "key", push: true }, $or(["x", "y"])],
        [
          {
            pop: ([a], [b], ctx) => ctx.tokens[a] === ctx.tokens[b],
          },
          $or(["x", "y"]),
        ],
      ])
    );
    is(parser(["x", "x"]), {
      results: [{ key: ["x"] }],
    });
    is(parser(["y", "y"]), {
      results: [{ key: ["y"] }],
    });
    is(parser(["x", "y"]), {
      error: true,
      errorType: ERROR_Seq_UnmatchStack,
    });
  });
  test("paired close: like jsx", () => {
    const { compile } = createContext();
    const parser = compile(
      $seqo([
        "<",
        [{ key: "key", push: true }, $regex(/^[a-z]+$/)],
        ">",
        [{ key: "value" }, $regex(/^[a-z]+$/)],
        "<",
        "/",
        [
          { pop: ([a], [b], { tokens }) => tokens[a] === tokens[b] },
          $regex(/^[a-z]+$/),
        ],
        ">",
      ])
    );
    is(parser(["<", "div", ">", "x", "<", "/", "div", ">"]), {
      results: [{ key: ["div"], value: ["x"] }],
    });
    is(parser(["<", "div", ">", "x", "<", "/", "a", ">"]), {
      error: true,
      errorType: ERROR_Seq_UnmatchStack,
    });
  });
  test("paired close: like jsx nested", () => {
    const { compile } = createContext();
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
        [
          { pop: ([a], [b], { tokens }) => tokens[a] === tokens[b] },
          $regex("[a-z]+"),
        ],
        ">",
        "<",
        "/",
        [
          { pop: ([a], [b], { tokens }) => tokens[a] === tokens[b] },
          $regex("[a-z]+"),
        ],
        ">",
      ])
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
        results: [{ tag1: ["div"], tag2: ["a"] }],
      }
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
        errorType: ERROR_Seq_UnmatchStack,
      }
    );
  });

  // test("atom", () => {
  //   const { compile } = createContext();
  //   const parser = compile(
  //     $repeat(
  //       $atom((ctx, pos) => {
  //         if (ctx.tokens[pos] === ">") {
  //           return fail(pos, -1, {} as any);
  //         }
  //         return success(pos, 1, ["a"]);
  //       })
  //     )
  //   );
  //   const ret = parser(["a", "b"]);
  //   throw ret;
  //   // is(ret, {
  //   //   success: true,
  //   //   re
  //   // })
  // });

  run({ stopOnFail: true, stub: true });
}
