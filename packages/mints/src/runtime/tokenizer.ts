const SKIP_TOKENS = ["\n", " ", "\t", "\r"];
export const CONTROL_TOKENS = [
  ";",
  ",",
  "{",
  "}",
  "(",
  ")",
  "+",
  "-",
  "/",
  "%",
  ">",
  "<",
  "'",
  '"',
  "`",
  "=",
  "!",
  "&",
  "|",
  "^",
  "~",
  "?",
  ":",
  ".",
  "*",
  "#",
  "[",
  "]",
  "\n",
  "\r",
  "\t",
  " ",
  "@",
];

const STRING_PAIR = ["'", '"', "`"] as const;

const regexRegex = /\/.+?(?<!\\)\//uy;

export function parseTokens(input: string): Generator<string> {
  const chars = createCharSlice(input);
  return parseTokenStream(chars) as Generator<string>;
}

function* parseTokenStream(
  chars: string | string[],
  initialCursor: number = 0,
  root = true
): Generator<string | number> {
  let _buf = "";
  let wrapStringContext: "'" | '"' | "`" | null = null;
  let openBraceStack = 0;
  let openParenStack = 0;
  let isLineComment = false;
  let isInlineComment = false;

  let i: number;
  for (i = initialCursor; i < chars.length; i++) {
    const char = chars[i];
    if (isLineComment) {
      if (char === "\n") {
        isLineComment = false;
      }
      continue;
    }

    // skip under inline comment
    if (isInlineComment) {
      const nextChar = chars[i + 1];
      if (char === "*" && nextChar === "/") {
        isInlineComment = false;
        i += 1; // exit comment
      }
      continue;
    }
    // string
    if (wrapStringContext) {
      const prevChar = chars[i - 1];
      if (char === wrapStringContext && prevChar !== "\\") {
        if (_buf.length > 0) {
          yield _buf;
          _buf = "";
        }
        wrapStringContext = null;
        yield char;
      } else {
        // detect ${expr} in ``
        if (wrapStringContext === "`" && char === "$" && chars[i + 1] === "{") {
          if (_buf.length > 0) {
            yield _buf;
            _buf = "";
          }
          yield "${";
          i += 2;
          for (const tok of parseTokenStream(chars, i, false)) {
            if (typeof tok === "string") {
              yield tok;
            } else {
              i = tok;
            }
          }
          yield "}";
          i += 1;
        } else {
          _buf += char;
        }
      }
      continue;
    }

    const nextChar = chars[i + 1];

    if (CONTROL_TOKENS.includes(char)) {
      let isEOL = false;
      // comment, line-comment, regex
      if (char === "/") {
        if (nextChar === "*") {
          if (_buf.length > 0) {
            yield _buf;
            _buf = "";
          }
          isInlineComment = true;
          continue;
        }
        if (nextChar === "/") {
          if (_buf.length > 0) {
            yield _buf;
            _buf = "";
          }
          isLineComment = true;
          i += 1;
          continue;
        }
      }

      // Handle negative stack to go out parent
      if (char === "(") openParenStack++;
      if (char === ")") openParenStack--;
      if (char === "{") openBraceStack++;
      if (char === "}") {
        openBraceStack--;
        if (!root && openBraceStack < 0) {
          i--; // back to prev char
          break;
        }
        // TODO: Regex
        if (openBraceStack === 0 && openParenStack === 0 && nextChar === "\n")
          isEOL = true;
      }

      // TODO: heuristic
      // not </
      // not / /
      if (
        char === "/" &&
        nextChar !== " " &&
        // />
        nextChar !== ">" &&
        // </
        chars[i - 1] !== "<"
      ) {
        regexRegex.lastIndex = i;
        if (regexRegex.test(chars instanceof Array ? chars.join("") : chars)) {
          wrapStringContext = char as any;
        }
      }

      // switch to string context
      if (STRING_PAIR.includes(char as any)) {
        wrapStringContext = char as any;
      }

      if (_buf.length > 0) {
        yield _buf;
        _buf = "";
      }
      if (!SKIP_TOKENS.includes(char)) {
        yield char;
        if (
          char === ";" &&
          openBraceStack === 0 &&
          openParenStack === 0 &&
          wrapStringContext === null
        ) {
          isEOL = true;
        }
      }
      if (isEOL) yield "\n";
    } else {
      _buf += char;
    }
  }

  if (_buf.length > 0) {
    yield _buf;
    _buf = "";
  }

  // EOF
  if (i === chars.length) {
    yield "\n";
  }
  if (!root) yield i;
}

function createCharSlice(input: string) {
  let chars: string | string[] = Array.from(input);
  return chars.length === input.length ? input : chars;
}

import { test, run } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const assert = require("assert");
  const eq = assert.deepStrictEqual;
  const expectParseResult = (input: string, expected: string[]) => {
    // let expectedCount = expected.length;
    // let count = 0;
    let tokens = [...parseTokenStream(input)];
    // for (const token of parseStream(input)) {
    //   eq(expected.shift(), token);
    //   count++;
    //   tokens.push(expected.shift())
    // }
    // console.log(expectedCount, count);
    assert.deepEqual(expected, tokens);
    // eq(count, expectedCount);
  };
  test("parse tokens", () => {
    const input = "a;bb cccc  d+e";
    let expected = ["a", ";", "\n", "bb", "cccc", "d", "+", "e", "\n"];
    expectParseResult(input, expected);
  });
  test("parse string", () => {
    const input = "'x y '";
    let expected = ["'", "x y ", "'", "\n"];
    expectParseResult(input, expected);
  });
  test("parse regex", () => {
    const input = "/x y/";
    let expected = ["/", "x y", "/", "\n"];
    expectParseResult(input, expected);

    expectParseResult("1 / 2", ["1", "/", "2", "\n"]);
    expectParseResult("1 / 2 / 3", ["1", "/", "2", "/", "3", "\n"]);
    expectParseResult("2/1\n1/1", ["2", "/", "1", "1", "/", "1", "\n"]);
    expectParseResult("/a\\/b/", ["/", "a\\/b", "/", "\n"]);
    expectParseResult("/a\nb/", ["/", "a", "b", "/", "\n"]);
  });

  test("parse template", () => {
    const input = "`xxx`";
    let expected = ["`", "xxx", "`", "\n"];
    expectParseResult(input, expected);
  });
  test("parse template expression", () => {
    const input = "`a${b+ c}d`";
    let expected = ["`", "a", "${", "b", "+", "c", "}", "d", "`", "\n"];
    expectParseResult(input, expected);
  });
  test("parse template expression 2", () => {
    const input = "`aaa ${bb + c } dd `";
    let expected = ["`", "aaa ", "${", "bb", "+", "c", "}", " dd ", "`", "\n"];
    expectParseResult(input, expected);
  });

  test("parse template expression 3", () => {
    const input = "`${a} x x ${b}`";
    let expected = ["`", "${", "a", "}", " x x ", "${", "b", "}", "`", "\n"];
    expectParseResult(input, expected);
  });

  test("parse template expression 4 nested", () => {
    const input = "`${`xxx`}`";
    let expected = ["`", "${", "`", "xxx", "`", "}", "`", "\n"];
    expectParseResult(input, expected);
  });

  test("parse template expression 5 nested", () => {
    const input = "`${`xxx ${1}`}`";
    let expected = [
      "`",
      "${",
      "`",
      "xxx ",
      "${",
      "1",
      "}",
      "`",
      "}",
      "`",
      "\n",
    ];
    expectParseResult(input, expected);
  });

  test("line comment", () => {
    expectParseResult("//aaa", ["\n"]);
    expectParseResult("a//aaa", ["a", "\n"]);
    expectParseResult("a//aaa \nb\n//", ["a", "b", "\n"]);
    // expectParseResult("a//aaa \nb", ["a", "b"]);
  });

  test("inline comment 2 ", () => {
    expectParseResult("/* */", ["\n"]);
    expectParseResult("/**/", ["\n"]);
    expectParseResult("a/**/", ["a", "\n"]);
    expectParseResult("a/* */", ["a", "\n"]);
    expectParseResult("a/* */a", ["a", "a", "\n"]);
    expectParseResult("a/* */a/**/a", ["a", "a", "a", "\n"]);
  });

  test("inline comment 3", () => {
    const code = `{  /* Invalid session is passed. Ignore. */}x`;
    const result = [...parseTokenStream(code)].map((token) => token);
    eq(result, ["{", "}", "x", "\n"]);
  });

  test("parse with newline", () => {
    const code = `
f(
{}
);
`;
    expectParseResult(code, ["f", "(", "{", "}", ")", ";", "\n", "\n"]);
  });
  test("Unicode", () => {
    expectParseResult("あ あ", ["あ", "あ", "\n"]);
    expectParseResult("あ/*え*/あ", ["あ", "あ", "\n"]);
    expectParseResult("𠮷/*𠮷*/𠮷", ["𠮷", "𠮷", "\n"]);
  });
  test("; in For", () => {
    let lineEndCount = 0;
    for (const token of parseTokenStream("for(;;)1;")) {
      if (token === "\n") {
        lineEndCount += 1;
      }
    }
    eq(lineEndCount, 2);
  });

  test("Multiline", () => {
    let lineEndCount = 0;
    for (const token of parseTokenStream("{}\n{};;1")) {
      if (token === "\n") {
        lineEndCount += 1;
      }
    }
    eq(lineEndCount, 4);
  });

  test("Multiline with Func", () => {
    let lineEndCount = 0;
    let before = [];
    let afterFirstLine = false;
    let after = [];
    for (const token of parseTokens("function f(){}\n1")) {
      // console.log("token", token);
      if (token === "\n") {
        lineEndCount += 1;
        afterFirstLine = true;
      } else {
        if (afterFirstLine) {
          after.push(token);
        } else {
          before.push(token);
        }
      }
    }
    eq(before, ["function", "f", "(", ")", "{", "}"]);
    eq(lineEndCount, 2);
    eq(after, ["1"]);
  });

  test("jsx", () => {
    expectParseResult("<a>text</a>", [
      "<",
      "a",
      ">",
      "text",
      "<",
      "/",
      "a",
      ">",
      "\n",
    ]);

    expectParseResult("<a>a b</a>", [
      "<",
      "a",
      ">",
      "a",
      "b",
      "<",
      "/",
      "a",
      ">",
      "\n",
    ]);

    expectParseResult("<a><hr /></a>", [
      "<",
      "a",
      ">",
      "<",
      "hr",
      "/",
      ">",
      "<",
      "/",
      "a",
      ">",
      "\n",
    ]);
  });

  run({ stopOnFail: true, stub: true, isMain });
}

if (process.env.NODE_ENV === "perf" && isMain) {
  const fs = require("fs");
  const path = require("path");
  const code = fs.readFileSync(
    path.join(__dirname, "../benchmark/cases/example4.ts"),
    "utf8"
  );
  for (let i = 0; i < 10; i++) {
    const start = process.hrtime.bigint();
    let result = [];
    let tokenCount = 0;
    for (const token of parseTokens(code)) {
      if (token === "\n") {
        tokenCount += result.length;
        result = [];
      } else {
        result.push(token);
      }
    }
    console.log(
      "finish",
      `${i}`,
      tokenCount + "tokens",
      Number(process.hrtime.bigint() - start) / 1_000_000 + "ms",
      Math.floor(
        tokenCount / (Number(process.hrtime.bigint() - start) / 1_000_000)
      ) + "tokens/ms"
    );
  }
}
