const regexRegex = /\/.+?(?<!\\)\//uy;

export function parseTokens(input: string): Generator<string> {
  const chars = createCharSlice(input);
  return parseStream(chars) as Generator<string>;
}

function* parseStream(
  // unicode slice or raw ascii string
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
        if (
          wrapStringContext === "`" &&
          char === "$" &&
          chars[i + 1] === L_BRACE
        ) {
          if (_buf.length > 0) {
            yield _buf;
            _buf = "";
          }
          yield "${";
          i += 2;
          for (const tok of parseStream(chars, i, false)) {
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
      if (char === SLASH) {
        if (nextChar === "*") {
          if (_buf.length > 0) {
            yield _buf;
            _buf = "";
          }
          isInlineComment = true;
          continue;
        }
        if (nextChar === SLASH) {
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
      if (char === L_PAREN) openParenStack++;
      if (char === R_PAREN) openParenStack--;
      if (char === L_BRACE) openBraceStack++;
      if (char === R_BRACE) {
        openBraceStack--;
        if (!root && openBraceStack < 0) {
          i--; // back to prev char
          break;
        }
        // TODO: Regex
        if (openBraceStack === 0 && nextChar === "\n") isEOL = true;
      }

      // TODO: heuristic
      // not </
      // not / /
      if (
        char === SLASH &&
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

  if (!root) yield i;
}

function createCharSlice(input: string) {
  let chars: string | string[] = Array.from(input);
  return chars.length === input.length ? input : chars;
}

import { test, run } from "@mizchi/test";
import {
  CONTROL_TOKENS,
  L_BRACE,
  L_PAREN,
  R_BRACE,
  R_PAREN,
  SKIP_TOKENS,
  SLASH,
  STRING_PAIR,
} from "../prebuild/constants";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const assert = require("assert");
  const eq = assert.deepStrictEqual;
  const expectParseResult = (input: string, expected: string[]) => {
    for (const token of parseStream(input)) {
      eq(expected.shift(), token);
    }
  };
  test("parse tokens", () => {
    const input = "a;bb cccc  d+e";
    let expected = ["a", ";", "\n", "bb", "cccc", "d", "+", "e"];
    expectParseResult(input, expected);
  });
  test("parse string", () => {
    const input = "'x y '";
    let expected = ["'", "x y ", "'"];
    expectParseResult(input, expected);
  });
  test("parse regex", () => {
    const input = "/x y/";
    let expected = ["/", "x y", "/"];
    expectParseResult(input, expected);

    expectParseResult("1 / 2", ["1", "/", "2"]);
    expectParseResult("1 / 2 / 3", ["1", "/", "2", "/", "3"]);
    expectParseResult("2/1\n1/1", ["2", "/", "1", "1", "/", "1"]);
    expectParseResult("/a\\/b/", ["/", "a\\/b", "/"]);
    expectParseResult("/a\nb/", ["/", "a", "b", "/"]);
  });

  test("parse template", () => {
    const input = "`xxx`";
    let expected = ["`", "xxx", "`"];
    expectParseResult(input, expected);
  });
  test("parse template expression", () => {
    const input = "`a${b+ c}d`";
    let expected = ["`", "a", "${", "b", "+", "c", "}", "d", "`"];
    expectParseResult(input, expected);
  });
  test("parse template expression 2", () => {
    const input = "`aaa ${bb + c } dd `";
    let expected = ["`", "aaa ", "${", "bb", "+", "c", "}", " dd ", "`"];
    expectParseResult(input, expected);
  });

  test("parse template expression 3", () => {
    const input = "`${a} x x ${b}`";
    let expected = ["`", "${", "a", "}", " x x ", "${", "b", "}", "`"];
    expectParseResult(input, expected);
  });

  test("parse template expression 4 nested", () => {
    const input = "`${`xxx`}`";
    let expected = ["`", "${", "`", "xxx", "`", "}", "`"];
    expectParseResult(input, expected);
  });

  test("parse template expression 5 nested", () => {
    const input = "`${`xxx ${1}`}`";
    let expected = ["`", "${", "`", "xxx ", "${", "1", "}", "`", "}", "`"];
    expectParseResult(input, expected);
  });

  test("line comment", () => {
    expectParseResult("//aaa", []);
    expectParseResult("a//aaa", ["a"]);
    expectParseResult("a//aaa \nb\n//", ["a", "b"]);
    // expectParseResult("a//aaa \nb", ["a", "b"]);
  });

  test("inline comment2 ", () => {
    expectParseResult("/* */", []);
    expectParseResult("/**/", []);
    expectParseResult("a/**/", ["a"]);
    expectParseResult("a/* */", ["a"]);
    expectParseResult("a/* */a", ["a", "a"]);
    expectParseResult("a/* */a/**/a", ["a", "a", "a"]);
  });

  test("inline comment 3", () => {
    const code = `{  /* Invalid session is passed. Ignore. */}x`;
    const result = [...parseStream(code)].map((token) => token);
    eq(result, ["{", "}", "x"]);
  });
  test("Unicode", () => {
    expectParseResult("あ あ", ["あ", "あ"]);
    expectParseResult("あ/*え*/あ", ["あ", "あ"]);
    expectParseResult("𠮷/*𠮷*/𠮷", ["𠮷", "𠮷"]);
  });

  test("; in For", () => {
    let lineEndCount = 0;
    for (const token of parseStream("for(;;)1;")) {
      if (token === "\n") {
        lineEndCount += 1;
      }
    }
    eq(lineEndCount, 1);
  });

  test("Multiline", () => {
    let lineEndCount = 0;
    for (const token of parseStream("{}\n{};;1")) {
      if (token === "\n") {
        lineEndCount += 1;
      }
    }
    eq(lineEndCount, 3);
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
    eq(lineEndCount, 1);
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
    ]);
  });

  // test("Multiline", () => {
  //   let lineEndCount = 0;
  //   for (const token of parseStream("{}\n{};1")) {
  //     if (token === "\n") {
  //       lineEndCount += 1;
  //     }
  //   }
  //   eq(lineEndCount, 2);
  // });

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
