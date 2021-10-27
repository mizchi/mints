import { is, run, test } from "@mizchi/test";
import {
  $close,
  $def,
  $eof,
  $not,
  $opt,
  $or,
  $pairClose,
  $pairOpen,
  $param,
  $ref,
  $regex,
  $repeat,
  $repeat_seq,
  $seq,
  $skip,
  $skip_opt,
  createRef,
} from "./builder";
import { compileFragment } from "./compiler";
import {
  CacheMap,
  Compiler,
  EOF,
  ERROR_Or_UnmatchAll,
  ERROR_Seq_Stop,
  ERROR_Token_Unmatch,
  PackratCache,
  ParseResult,
  RootCompiler,
  RootParser,
  SEQ,
  Seq,
} from "./types";
import { buildRangesToString, isNumber } from "./utils";

export { reportError } from "./error_reporter";

export function createContext(partial: Partial<Compiler> = {}) {
  const compiler: Compiler = {
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

    const rootParser: RootParser = (input: string) => {
      const cache = createPackratCache();
      const rootResult = parseFromRoot(
        {
          root: resolved.id,
          raw: input,
          openStack: [],
          // chars: Array.from(input),
          cache,
        },
        0
      );
      if (!rootResult.error && rootResult.result === "") {
        const text = buildRangesToString(input, rootResult.ranges);
        return {
          ...rootResult,
          result: text,
        };
      }
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
    return measurePerf("c-" + id, () => {
      const cached = get(id as number, pos);
      if (cached) {
        cacheHitCount++;
        return cached;
      }
      cacheMissCount++;
      const result = creator();
      add(id as number, pos, result);
      return result;
    });
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
const addPerfTime = (id: string, time: number) => {
  const prev = perfTimes.get(id);
  if (prev) {
    perfTimes.set(id, { sum: prev.sum + time, count: prev.count + 1 });
  } else {
    perfTimes.set(id, { sum: time, count: 1 });
  }
};

const measurePerf = <Fn extends (...args: any[]) => any>(
  id: string,
  fn: Fn
): ReturnType<Fn> => {
  if (process.env.NODE_ENV === "perf") {
    // const start = Date.now();
    // const ret = fn();
    // addPerfTime(id, Date.now() - start);
    const start = process.hrtime.bigint();
    const ret = fn();
    addPerfTime(id, Number(process.hrtime.bigint() - start));
    return ret;
  }
  return fn();
};

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

if (process.env.NODE_ENV === "test" && require.main === module) {
  test("whitespace", () => {
    const { compile } = createContext();
    is(compile($regex(`\\s`))(" "), { result: " " });
    is(compile($regex("\\s+"))("  "), { result: "  " });
  });

  test("token", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a"]));
    is(parser("a"), { result: "a" });
  });

  test("regex sharthand", () => {
    const { compile } = createContext();
    const parser = compile($regex(`\\w`), { end: true });
    is(parser("a"), { result: "a" });
  });

  test("token2", () => {
    const { compile } = createContext();
    const parser = compile($regex(`\\s*a`));
    is(parser("a"), { result: "a" });
    is(parser(" a"), { result: " a" });
    is(parser("  y"), { error: true });
  });

  test("nested-token", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $seq(["b", "c"])]));
    is(parser("abc"), { result: "abc" });
    is(parser("adb").error, true);
  });

  test("not", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq([$not(["a"]), $regex(`\\w`), $not(["b"]), $regex("\\w")])
    );
    is(parser("ba"), { result: "ba" });
    is(parser("ab").error, true);
    is(parser("aa").error, true);
    is(parser("bb").error, true);
  });

  test("seq-shorthand", () => {
    const { compile } = createContext();
    const seq = $seq([
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
    const { compile } = createContext();

    const seq = $seq([$param("a", "x"), $param("b", "y")]);
    const parser = compile(seq);
    is(parser("xy"), {
      error: false,
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
      ranges: [[0, 2]],
    });
    is(parser("xyz"), {
      result: { a: "x", b: "y" },
      len: 2,
      pos: 0,
    });
    is(parser("xz"), {
      error: true,
      errorType: ERROR_Seq_Stop,
      pos: 1,
      errorChild: {},
      // detail: {
      //   child: {
      //     pos: 1,
      //     // detail: '"z" does not fill: y',
      //     error: true,
      //     errorType: ErrorType.Token_Unmatch,
      //   },
      // },
    });
    is(parser(" xy"), {
      error: true,
      errorType: ERROR_Seq_Stop,
      pos: 0,
      errorChild: {},
      // detail: {
      //   child: {
      //     error: true,
      //     pos: 0,
      //     errorType: ErrorType.Token_Unmatch,
      //     // detail: '" xy" does not fill: x',
      //   },
      // },
    });
  });

  test("seq:skip", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $skip($regex("\\s+")), "b"]));
    is(parser("a   b"), { result: "ab" });
  });

  test("seq:skip_opt", () => {
    const { compile } = createContext({});
    const parser = compile(
      $seq(["a", $skip_opt($seq([":", "@"])), "=", "b"])
      // { end: true }
    );
    is(parser("a=b"), { result: "a=b" });
    is(parser("a:@=b"), { result: "a=b" });
  });

  test("seq:eof", () => {
    const { compile } = createContext();
    const parser = compile($seq(["a", $eof()]));
    // console.log("parse", parser("a"));
    is(parser("a"), { result: "a" });
    is(parser("a ").error, true);

    const parser2 = compile($seq([$eof()]));
    is(parser2(""), { result: "" });
  });

  test("seq:eof-eof", () => {
    const { compile } = createContext({});
    const parser = compile(
      $repeat(
        $seq([
          // a
          "a",
          $or([$regex("\\n"), $eof()]),
        ])
      )
    );
    is(parser("a\na\na"), { result: ["a\n", "a\n", "a"] });
  });

  test("seq-with-param", () => {
    const { compile } = createContext();
    const seq = $seq([$param("a", "a")]);
    const parser = compile(seq);
    is(parser("a"), { result: { a: "a" }, len: 1, pos: 0 });
    is(parser("ab"), {
      result: { a: "a" },
      len: 1,
      pos: 0,
    });
    is(parser("x"), {
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
    const _ = $def(() => $regex("\\s"));

    const seq = $seq(["a", _, "b", _, "c"]);
    const parser = compile(seq);
    is(parser("a b c"), {
      result: "a b c",
      len: 5,
      pos: 0,
    });
  });

  test("repeat", () => {
    const { compile } = createContext();
    const seq = $repeat(
      $seq([
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
    const { compile } = createContext();
    const parser = compile($repeat_seq(["a", "b", $eof()]));
    is(parser("ab"), {
      error: false,
      result: ["ab"],
      pos: 0,
      len: 2,
    });
    const parser2 = compile($seq([$repeat($seq(["a", "b", $eof()])), $eof()]));
    is(parser2("ab"), {
      error: false,
      result: "ab",
      pos: 0,
      len: 2,
    });
  });

  test("repeat:minmax", () => {
    const { compile } = createContext();
    const rep = $repeat($seq(["xy"]), [1, 2]);
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
    const { compile } = createContext();
    const parser = compile($repeat($seq(["ab"]), [1, 2]));
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
    const { compile } = createContext();
    const seq = $seq([$regex("aaa\\nbbb")]);
    const parser = compile(seq);
    is(parser(`aaa\nbbb`), {
      result: "aaa\nbbb",
      len: 7,
      pos: 0,
    });
  });

  test("seq:opt", () => {
    const { compile } = createContext();
    const seq = $seq(["a", $opt("b"), "c"]);
    const parser = compile(seq);
    is(parser(`abc`), {
      result: "abc",
      len: 3,
      pos: 0,
    });
    is(parser(`ac`), {
      result: "ac",
      len: 2,
      pos: 0,
    });
  });

  test("repeat", () => {
    const { compile } = createContext();
    const seq = $repeat(
      $seq([
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
    const { compile } = createContext();
    const seq = $seq([
      $regex("__"),
      $param(
        "xylist",
        $repeat(
          $seq([
            ["a", "x"],
            ["b", "y"],
          ])
        )
      ),
      $regex("_+"),
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
    const { compile } = createContext();
    const seq = $or(["x", "y"]);
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
      errorType: ERROR_Or_UnmatchAll,
      pos: 0,
      errors: [
        {
          error: true,
          pos: 0,
          errorType: ERROR_Token_Unmatch,
          // detail: "x",
        },
        {
          error: true,
          pos: 0,
          errorType: ERROR_Token_Unmatch,
          // detail: "y",
        },
      ],
      // ]
    });
  });

  test("or:with-cache", () => {
    const { compile } = createContext();
    const seq = $or([$seq(["x", "y", "z"]), $seq(["x", "y", "a"])]);
    const parser = compile(seq);
    is(parser("xya"), {
      result: "xya",
      len: 3,
      pos: 0,
    });
    // console.log("xyb", JSON.stringify(parser("xyb"), null, 2));
    is(parser("xyb"), {
      error: true,
      pos: 0,
      errorType: ERROR_Or_UnmatchAll,
      // errors: [
      //   {
      //     error: true,
      //     errorType: ErrorType.Seq_Stop,
      //     pos: 0,
      //     childError: {
      //       error: true,
      //       pos: 0,
      //       errorType: ErrorType.Token_Unmatch,
      //       // detail: "xyz",
      //     },
      //   },
      //   {
      //     error: true,
      //     errorType: ErrorType.Seq_Stop,
      //     pos: 0,
      //     childError: {
      //       error: true,
      //       pos: 0,
      //       errorType: ErrorType.Token_Unmatch,
      //       // detail: "xya",
      //     },
      //   },
      // ],
    });
  });

  test("reuse recursive with suffix", () => {
    // const Paren = 1000;
    const { compile } = createContext({});
    const paren = $def(() =>
      $seq([
        "\\(",
        $or([
          // nested: ((1))
          $ref(paren),
          // (1),
          "1",
        ]),
        "\\)",
      ])
    );
    const parser = compile(paren);
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

  test("skip in or", () => {
    const { compile } = createContext();
    // read next >
    const parser = compile($or([$seq(["a", $skip("b"), "c"]), "xxx"]));
    is(parser("abc"), { result: "ac" });
  });
  test("skip in repeat", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq([$repeat($or([$seq(["a", $skip("b"), "c"]), "xxx"]))])
    );
    is(parser("abcabcxxx"), { result: "acacxxx" });
  });

  test("seq-string with reshape", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq([
        // a
        "a",
        $seq(["bb"], () => "_"),
        $skip("c"),
        "d",
      ]),
      { end: true }
    );
    is(parser("abbcd"), { result: "a_d" });
    // is(parser("abbd"), { error: true });
  });

  test("seq:skip-nested", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq([
        //xx
        "a",
        $seq([$skip("b"), "c"]),
      ])
    );
    is(parser("abc"), { result: "ac" });
  });
  test("seq:skip-nested2", () => {
    const { compile } = createContext();
    const parser = compile($or([$seq([$skip("b")])]));
    is(parser("b"), { result: "" });
  });
  test("seq:skip-nested3-optional", () => {
    const { compile } = createContext();
    const parser = compile($or([$seq([$skip_opt("b")])]));
    is(parser("b"), { result: "" });
    is(parser(""), { result: "" });
  });

  test("skip with repeat", () => {
    const { compile } = createContext();
    const parser = compile($seq([$repeat_seq(["a", $skip("b")])]));
    is(parser("ababab"), { result: "aaa" });
  });

  test("paired close", () => {
    const { compile } = createContext();
    const parser = compile(
      $seq([
        "<",
        ["key", $pairOpen($regex("[a-z]+"))],
        ">",
        ["v", "x"],
        "</",
        $pairClose($regex("[a-z]+")),
        ">",
      ])
    );
    is(parser("<div>x</div>"), { result: { v: "x" } });
    is(parser("<a>x</a>"), { result: { v: "x" } });
  });

  test("paired close nested", () => {
    const { compile } = createContext();
    const tag = $def(() =>
      $seq([
        "<",
        $pairOpen($regex("[a-z]+")),
        ">",
        $repeat($or([tag, $regex("[a-z]+")])),
        "</",
        $pairClose($regex("[a-z]+")),
        ">",
      ])
    );
    const parser = compile(tag, { end: true });
    is(parser("<div></div>"), { result: "<div></div>" });
    is(parser("<div><a></a></div>"), { result: "<div><a></a></div>" });
    is(parser("<div><a></a><b></b>xxx</div>"), {
      result: "<div><a></a><b></b>xxx</div>",
    });
    is(parser("<div><a></b></div>"), {
      error: true,
    });

    // is(parser("<a>x</a>"), { result: { v: "x" } });
  });

  run({ stopOnFail: true, stub: true });
}
