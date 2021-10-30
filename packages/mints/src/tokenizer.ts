const DOUBLE_QUOTE = '"';
const SINGLE_QUOTE = "'";
const BACK_QUOTE = "`";
const SLASH = "/";

const STRING_PAIR = [SINGLE_QUOTE, DOUBLE_QUOTE, BACK_QUOTE] as const;

const L_BRACE = "{";
const R_BRACE = "}";

const CONTROL_TOKENS = [
  ";",
  ",",
  L_BRACE,
  R_BRACE,
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
  "[",
  "]",
  "\n",
  "\r",
  "\t",
  " ",
];
const SKIP_TOKENS = ["\n", " ", "\t", "\r"];

function parseTokens(input: string): Generator<string> {
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
    if (CONTROL_TOKENS.includes(char)) {
      const nextChar = chars[i + 1];
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
      if (char === L_BRACE) openBraceStack++;
      else if (char === R_BRACE) {
        openBraceStack--;
        if (!root && openBraceStack < 0) {
          // exit by negative stack
          i--; // back to prev char
          break;
        }
        if (openBraceStack === 0 && nextChar === "\n") {
          // push separator
          yield "\n";
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
          wrapStringContext === null
        ) {
          yield "\n";
        }
      }
    } else {
      _buf += char;
    }
  }

  if (_buf.length > 0) {
    yield _buf;
    _buf = "";
  }

  if (!root) {
    yield i;
  }

  if (isInlineComment || wrapStringContext) {
    throw new Error(`unclosed ${i}`);
  }
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

  // TODO: Handle escape
  // test("parse escaped string", () => {
  //   // prettier-ignore
  //   const input = "'\'aaa\''";
  //   // prettier-ignore
  //   let expected = ["'", "'aaa'", "'"];
  //   expectParseResult(input, expected);
  // });

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
    console.log(result);
    eq(result, ["{", "}", "x"]);
  });
  test("Unicode", () => {
    expectParseResult("あ あ", ["あ", "あ"]);
    expectParseResult("あ/*え*/あ", ["あ", "あ"]);
    expectParseResult("𠮷/*𠮷*/𠮷", ["𠮷", "𠮷"]);
  });

  run({ stopOnFail: true, stub: true, isMain });
}

if (process.env.NODE_ENV === "perf") {
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
