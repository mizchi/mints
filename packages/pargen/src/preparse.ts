// const TOKEN_MODE = 0;
const UNDER_DOUBLE_QUOTE = '"';
const UNDER_SINGLE_QUOTE = "'";
// const UNDER_REGEX = "/";
const UNDER_BACK_QUOTE = "`";
// const UNDER_LINE_COMMENT = "/*";
// const UNDER_INLINE_COMMENT = "//";

const SIMPLE_CHAR_PAIR = [
  UNDER_SINGLE_QUOTE,
  UNDER_DOUBLE_QUOTE,
  UNDER_BACK_QUOTE,
];

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

// type Token = [token: typeof END | string, start: number, end: number];
type Token = string | number;

function* parseStream(
  input: string,
  initialCursor: number = 0,
  depth = 0
): Generator<Token> {
  const prefix = " ".repeat(depth);
  const DEBUG = process.env.NODE_ENV === "test";
  const log = (...args: any) => DEBUG && console.log(prefix, ...args);

  const chars = Array.from(input);
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
        i += 1; // skip to next
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
          // if (flushable()) yield flush();
          if (_buf.length > 0) {
            yield _buf;
            _buf = "";
          }
          yield "${";
          i += 2;
          for (const tok of parseStream(input, i, depth + 1)) {
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
      if (char === "/" && nextChar === "*") {
        log("enter inline", i);
        if (_buf.length > 0) {
          yield _buf;
          _buf = "";
        }

        isInlineComment = true;
        continue;
      }
      if (char === "/" && nextChar === "/") {
        if (_buf.length > 0) {
          yield _buf;
          _buf = "";
        }

        isLineComment = true;
        i += 1;
        continue;
      }

      // Handle negative stack to go out parent
      if (char === L_BRACE) openBraceStack++;
      else if (char === R_BRACE) {
        openBraceStack--;
        if (openBraceStack < 0) {
          log("> exit by negative stack", i, char);
          i--; // back to prev char
          break;
        }
        if (openBraceStack === 0 && nextChar === "\n") {
          // push separator
          yield "\n";
        }
      }
      // switch context
      if (SIMPLE_CHAR_PAIR.includes(char)) {
        wrapStringContext = char as any;
      }
      // if (flushable()) yield flush();
      if (_buf.length > 0) {
        yield _buf;
        _buf = "";
      }
      if (SKIP_TOKENS.includes(char)) {
        // yield [SPACE, i];
      } else {
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

  if (depth > 0) {
    yield i;
  }

  if (depth === 0) {
    if (isInlineComment) {
      throw new Error(`unclosed inline comment`);
    }
  }
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

  run({ stopOnFail: true, stub: true, isMain });
}

if (process.env.NODE_ENV === "perf") {
  for (let i = 0; i < 10; i++) {
    const fs = require("fs");
    const path = require("path");
    const big = fs.readFileSync(
      path.join(__dirname, "_fixtures/vscode-example.ts"),
      "utf8"
    );
    const start = process.hrtime.bigint();
    let result = [];
    let tokenCount = 0;
    for (const token of parseStream(big)) {
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

// export function preparse(text: string): Array<string[]> {
//   let braceStack = 0;
//   let parenStack = 0;
//   let _mode:
//     | typeof TOKEN_MODE
//     | typeof UNDER_BACK_QUOTE
//     | typeof UNDER_SINGLE_QUOTE
//     | typeof UNDER_DOUBLE_QUOTE
//     | typeof UNDER_REGEX
//     | typeof UNDER_BACK_QUOTE
//     | typeof UNDER_LINE_COMMENT
//     | typeof UNDER_INLINE_COMMENT = TOKEN_MODE;
//   const isStackClean = () => braceStack === 0 && parenStack === 0;

//   let _buf = "";
//   let _tokens: string[] = [];
//   let _stmts: Array<string[]> = [];

//   const pushChar = (char: string) => {
//     _buf += char;
//   };

//   const finishToken = () => {
//     if (_buf.length > 0) {
//       _tokens.push(_buf);
//       _buf = "";
//     }
//   };

//   const finishTokenWith = (next: string) => {
//     finishToken();
//     if (next && next.length > 0) {
//       _tokens.push(next);
//     }
//   };

//   const finishStmt = () => {
//     finishToken();
//     if (_tokens.length) {
//       // lines.push(_tokens.join(""));
//       _stmts.push(_tokens);
//       _tokens = [];
//       _buf = "";
//     }
//   };
//   // let isString = '';
//   const chars = Array.from(text);

//   for (let i = 0; i < chars.length; i++) {
//     const char = chars[i];

//     // Handle token
//     if (_mode === TOKEN_MODE) {
//       if (SKIP_TOKENS.includes(char)) {
//         finishToken();
//         continue;
//       }

//       if (char === ";") {
//         finishStmt();
//         continue;
//       }
//       if (char === "}" && chars[i + 1] === "\n") {
//         finishTokenWith(char);
//         finishStmt();
//         continue;
//       }

//       switch (char) {
//         // support next line;
//         case "}": {
//           finishTokenWith(char);
//           braceStack--;
//           const isNextNewline = chars[i + 1] === "\n";
//           // NOTE: if next line is newline, then finish stmt
//           if (isStackClean() && isNextNewline) {
//             finishStmt();
//           }
//           break;
//         }
//         case "(":
//           parenStack++;
//           finishTokenWith(char);
//           break;
//         case ")":
//           parenStack--;
//           finishTokenWith(char);
//           break;
//         case "{":
//           braceStack++;
//           finishTokenWith(char);
//           break;
//         case '"':
//           finishTokenWith(char);
//           _mode = UNDER_DOUBLE_QUOTE;
//           break;
//         case '"':
//           finishTokenWith(char);
//           _mode = UNDER_SINGLE_QUOTE;
//           break;
//         default: {
//           pushChar(char);
//         }
//       }
//       continue;
//     }

//     if (SIMPLE_CHAR_PAIR.includes(_mode as any)) {
//       if (char === _mode) {
//         _mode = TOKEN_MODE;
//         finishTokenWith(char);
//       }

//       continue;
//     }
//   }
//   finishStmt();
//   return _stmts;
// }

// test("preparse", () => {
//   const text = "a;bb;{a};{}\nccc;\nfunction(){}";
//   const lines = preparse(text);
//   console.log("lines", lines);
//   is(lines, [
//     ["a"],
//     ["bb"],
//     ["{", "a", "}"],
//     ["{", "}"],
//     ["ccc"],
//     ["function", "(", ")", "{", "}"],
//   ]);
// });
