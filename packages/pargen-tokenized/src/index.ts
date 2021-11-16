// import { ParseContext } from "./../../pargen/src/types";
import type { ParseResult, RootCompiler, RootParser } from "./types";

import { compileFragment, success } from "./runtime";

const isNumber = (x: any): x is number => typeof x === "number";

export function createContext() {
  const rootCompiler: RootCompiler = (rule) => {
    let entry = isNumber(rule) ? createRef(rule) : rule;
    const entryRefId = $def(() => $seq([entry, $eof()]));
    const [rules, refs] = $close();

    const rootParser: RootParser = (tokens: string[]) => {
      const cache = new Map<string, ParseResult>();
      const ctx = {
        root: entry.u,
        tokens,
        currentError: null,
        cache,
        refs,
        rules,
        parsers: rules.map(compileFragment),
      };

      // console.log("parse start", entryRefId, ctx.rules[ctx.refs[entryRefId]]);
      const rootResult = ctx.parsers[ctx.refs[entryRefId]](ctx, 0);
      if (rootResult.error && ctx.currentError) {
        // @ts-ignore
        return { ...ctx.currentError, tokens };
      }
      return rootResult;
    };
    return rootParser;
  };
  return rootCompiler;
}

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
import {
  CODE_EOF_UNMATCH,
  CODE_OR_UNMATCH_ALL,
  CODE_SEQ_STOP,
  CODE_SEQ_UNMATCH_STACK,
  CODE_TOKEN_UNMATCH,
} from "./constants";
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
    const compile = createContext();
    const parse = compile($seq([$eof(), $eof()]));
    is(parse([]), { results: [] });
    is(parse(["a"]), { error: true });
  });

  test("any", () => {
    const compile = createContext();
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
    const compile = createContext();
    const parse = compile($token("a"));
    is(parse(["a"]), { results: [0] });
    expectSuccess(parse, ["a"], "a");
    expectFail(parse, ["b"]);
  });

  test("token with reshaped", () => {
    const compile = createContext();
    const parse = compile($token("a", (token) => token + "_mod"));
    is(parse(["a"]), { results: ["a_mod"] });
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
    const parse = compile($regex(/^\w+$/));
    expectSuccess(parse, ["abc"], "abc");
    expectFail(parse, [""]);
    const parse2 = compile($regex(/^a$/));
    expectFail(parse2, ["xa"]);
    expectSuccess(parse2, ["a"], "a");
  });

  test("regex with reshape", () => {
    const compile = createContext();
    const parse = compile($regex(/^\w+$/, (token) => token + "_mod"));
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
    const compile = createContext();
    const parser = compile(
      $seq(["a", "b"], (results) => {
        return results.map((i) => i + ".");
      })
    );
    expectSuccess(parser, ["a", "b"], "a.b.");
  });

  test("seqo", () => {
    const compile = createContext();
    const parser = compile(
      $seqo([
        ["a", "x"],
        ["b", "y"],
      ])
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
      ])
    );
    expectSuccessSeqObject(parser, ["x", "y"], {
      a: "x",
      b: "y",
    });
  });

  test("seq:skip", () => {
    const compile = createContext();
    const parser = compile($seq(["a", $skip("x"), "b"]));
    expectSuccess(parser, ["a", "x", "b"], "ab");
    is(parser(["a", "b"]), {
      error: true,
      code: CODE_SEQ_STOP,
      childError: { code: CODE_TOKEN_UNMATCH },
    });
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
    expectSuccess(parse, [], "");
    expectSuccess(parse, ["a"], "a");
    expectSuccess(parse, ["a", "a", "a"], "aaa");
    // expectSuccess(parse, ["b"], "");
  });

  test("repeat_reshape", () => {
    const compile = createContext();
    const parse = compile(
      $repeat<string, string, string[]>($token("a"), ([a]) => a + "x")
    );
    expectSuccess(parse, [], "");
    expectSuccess(parse, ["a"], "ax");
    expectSuccess(parse, ["a", "a"], "axax");

    const parseWithTransResult = compile(
      $repeat<string, string, any>(
        $token("a"),
        ([a]) => a + "x",
        (results) => {
          return results.join("") + "-end";
        }
      )
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
    is(parser(["a"]), { results: [{ a: ["a"] }], pos: 0 });
    expectSuccessSeqObject(parser, ["a"], { a: "a" });

    is(parser(["x"]), {
      pos: 0,
      error: true,
      code: CODE_SEQ_STOP,
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
    is(parser(["z"]).childError, {
      error: true,
      code: CODE_OR_UNMATCH_ALL,
      pos: 0,
      errors: [
        {
          // error: true,
          pos: 0,
          code: CODE_TOKEN_UNMATCH,
        },
        {
          // error: true,
          pos: 0,
          code: CODE_TOKEN_UNMATCH,
        },
      ],
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
      code: CODE_SEQ_STOP,
      childError: {
        error: true,
        code: CODE_TOKEN_UNMATCH,
      },
    });
  });

  test("reuse recursive with suffix", () => {
    // const Paren = 1000;
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
      ])
    );
    const parser = compile(paren, { end: true });
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
      ])
    );
    expectSuccess(parser, "abcabcxxx".split(""), "acacxxx");
    expectFail(parser, "abcz".split(""));
  });

  test("seq-string with reshape", () => {
    const compile = createContext();
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
    const compile = createContext();
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
      code: CODE_SEQ_UNMATCH_STACK,
    });
  });
  test("paired close: like jsx", () => {
    const compile = createContext();
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
      code: CODE_SEQ_UNMATCH_STACK,
    });
  });
  test("paired close: like jsx nested", () => {
    const compile = createContext();
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
        code: CODE_SEQ_UNMATCH_STACK,
      }
    );
  });

  test("atom: jsx string", () => {
    const compile = createContext();
    const parser = compile(
      $seq([
        "<",
        $atom((ctx, pos) => {
          let i = 0;
          const results: string[] = [];
          while (i < ctx.tokens.length) {
            const token = ctx.tokens[pos + i];
            if ([">", "<", "{"].includes(token)) {
              break;
            }
            results.push(token);
            i++;
          }
          return success(pos, i, [results.join(" ")]);
        }),
        ">",
      ])
    );
    const ret = parser(["<", "ab", "cd", ">"]);
    is(ret, {
      error: false,
      pos: 0,
      len: 4,
      results: [0, "ab cd", 3],
    });
  });

  run({ stopOnFail: true, stub: true });
}
