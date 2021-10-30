const TOKEN_MODE = 0;
const UNDER_DOUBLE_QUOTE = '"';
const UNDER_SINGLE_QUOTE = "'";
const UNDER_REGEX = "/";
const UNDER_BACK_QUOTE = "`";
const UNDER_LINE_COMMENT = "/*";
const UNDER_INLINE_COMMENT = "//";

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

const END = Symbol();

type Token = [token: typeof END | string, start: number, end: number];

function* parseStream(
  input: string,
  initialCursor: number = 0,
  depth = 0
): Generator<Token> {
  // debug
  const prefix = " ".repeat(depth);
  const log = (...args: any) => console.log(prefix, ...args);

  const chars = Array.from(input);
  let _buf = "";
  let wrapContext: "'" | '"' | "`" | null = null;
  let openBraceStack = 0;

  let i: number;
  let _start = 0;
  let _end = 0;

  const pushChar = (char: string, cur: number) => {
    if (_buf.length === 0) {
      _start = cur;
    }
    _buf += char;
    _end = cur;
  };

  const flush = () => {
    if (_buf.length === 0) {
      throw new Error(`can not flush`);
    }
    const r = [_buf, _start, _end] as Token;
    log(`> push`, JSON.stringify(_buf), _start, _end);
    _buf = "";
    _start = 0;
    _end = 0;
    return r;
  };

  const pushAndFlush = (
    char: string,
    cur: number,
    end: number = cur + char.length
  ) => {
    pushChar(char, cur);
    _end = end;
    return flush();
  };

  for (i = initialCursor; i < chars.length; i++) {
    const char = chars[i];
    if (wrapContext) {
      // single char
      if (char === wrapContext) {
        if (_buf.length) yield flush();
        wrapContext = null;
        yield pushAndFlush(char, i, i + 1);
      } else {
        // detect ${expr} in `...`
        if (wrapContext === "`" && char === "$" && chars[i + 1] === "{") {
          if (_buf.length) yield flush();
          yield pushAndFlush("${", i, i + 2);
          i += 2;
          for (const child of parseStream(input, i, depth + 1)) {
            if (child[0] !== END) {
              yield child;
            }
            i = child[2];
          }
          yield pushAndFlush("}", i, i + 1);
          log("next char", i, chars[i + 1]);
          i += 1;
        } else {
          _buf += char;
        }
      }
      continue;
    }
    if (CONTROL_TOKENS.includes(char)) {
      // if (char === "") {};

      // Handle negative stack to go out parent
      if (char === L_BRACE) openBraceStack++;
      else if (char === R_BRACE) {
        openBraceStack--;
        if (openBraceStack < 0) {
          log("> quit negative stack", i, char);
          i--; // back to prev char
          break;
        }
      }
      // switch context
      if (SIMPLE_CHAR_PAIR.includes(char)) {
        wrapContext = char as any;
      }
      // flush
      if (_buf.length) {
        yield flush();
      }
      // skip whitespace
      if (SKIP_TOKENS.includes(char)) {
        // yield [SPACE, i];
      } else {
        yield pushAndFlush(char, i, i + 1);
      }
    } else {
      pushChar(char, i);
    }
  }
  if (_buf.length > 0) {
    yield flush();
  }
  if (depth > 0) {
    yield [END, i, i];
  }
}

import { test, run, is } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const expectParseResult = (input: string, expected: string[]) => {
    for (const [token] of parseStream(input)) {
      is(token, expected.shift());
    }
  };
  test("parse tokens", () => {
    const input = "a;bb cccc  d+e";
    let expected = ["a", ";", "bb", "cccc", "d", "+", "e"];
    expectParseResult(input, expected);
  });
  test("parse string", () => {
    const input = "'x y '";
    let expected = ["'", "x y ", "'"];
    expectParseResult(input, expected);
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

  run({ stopOnFail: true, stub: true, isMain });
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
