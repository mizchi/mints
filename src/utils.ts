// const regexMatch = /([\(\{\[])/g;

export type TokenMap<T extends string> = Record<T, Array<number>>;

export const findPatternAt = (
  input: string,
  regex: string,
  pos: number
): string | null => {
  const re = new RegExp(`(?<=.{${pos}})${regex}`, "m");
  const match = re.exec(input);
  const notMatch = match == null || match.index !== pos;
  if (notMatch) return null;
  return match[0];
};

export function buildTokenMap<T extends string>(
  text: string,
  readChars: Array<T>
): TokenMap<T> {
  const chars = Array.from(text);
  const map: TokenMap<T> = readChars.reduce(
    (acc, char) => ({ ...acc, [char]: [] }),
    {} as TokenMap<T>
  );

  for (let i = 0; i < chars.length; i++) {
    const char = text[i];
    if (readChars.includes(char as T)) {
      map[char as T].push(i);
    }
  }
  return map;
}

export function readPairedBlock(
  tokenMap: TokenMap<any>,
  pos: number,
  max: number,
  [start, end]: [start: string, end: string]
): number | void {
  const startList = tokenMap[start];
  const endList = tokenMap[end];
  let stack = 0;

  if (pos !== startList[0]) {
    // not opend as first char
    return;
  }

  for (let i = pos; i < max; i++) {
    if (startList.includes(i)) {
      stack++;
    }
    if (endList.includes(i)) {
      stack--;
    }
    if (stack === 0) {
      return i + Array.from(end).length;
    }
  }
}

// @ts-ignore
import { test, run } from "@mizchi/testio/dist/testio.cjs";
import assert from "assert";
if (process.env.NODE_ENV === "test" && require.main === module) {
  // @ts-ignore
  const eq = (...args: any[]) => assert.deepStrictEqual(...(args as any));
  test("buildTokenMap & pair", () => {
    const text = "( { { a } } ) [ ]";
    const chars = ["(", ")", "{", "}", "[", "]"];
    const map = buildTokenMap(text, chars);
    console.log(map);
    eq(map, {
      "(": [0],
      ")": [12],
      "{": [2, 4],
      "}": [8, 10],
      "[": [14],
      "]": [16],
    });

    const hit = readPairedBlock(map, 0, text.length, ["(", ")"]);
    eq(text.slice(0, hit as number), "( { { a } } )");

    const hit2 = readPairedBlock(map, 2, text.length, ["{", "}"]);
    eq(text.slice(2, hit2 as number), "{ { a } }");
  });

  test("findPatternAt", () => {
    eq(findPatternAt("a", "a", 0), "a");
    eq(findPatternAt("abc", "\\w+", 0), "abc");
    eq(findPatternAt("a\nb", "a\\nb", 0), "a\nb");
    eq(findPatternAt("a\nb", "\\nb", 1), "\nb");
    eq(findPatternAt("a\nb", "\\sb", 1), "\nb");
  });
  run({ stopOnFail: true, stub: true });
}
