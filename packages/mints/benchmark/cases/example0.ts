// , b: number[], c: Array<string>;
const x: number = 1;

let a, b, c;

function square(x: number): number {
  return x ** 2;
}

square(2);

type IPoint = {
  x: number;
  y: number;
};

if (1) {
  1;
} else {
  while (false) {}
}

class Point<T extends IPoint = any> implements Object {
  public x: number;
  private y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  public static async foo(arg: number): Promise<number> {
    return arg;
  }
}

const p = new Point(1, 2);

console.log(p.x);

func<T>();

export { x, x as y, p };

export const v = 1;

export class Foo {
  x: number = 1;
}

console.log("aaa");

const el = document.querySelector("#app");

console.log("el", el);

switch (1 as number) {
  case 1:
  case 2: {
    break;
  }
  default: {
    console.log(!!1);
  }
}

import {
  OPERATORS,
  RESERVED_WORDS,
  REST_SPREAD,
  SPACE_REQUIRED_OPERATORS,
  _ as _w,
  __ as __w,
} from "../../src/constants";

declare const foo: any;

import { RootCompiler, RootParser } from "@mizchi/pargen/src/types";
import { createContext } from "@mizchi/pargen/src";
import { preprocessLight } from "../../src/preprocess";
const { compile } = createContext({
  // composeTokens: true,
  // pairs: ["{", "}"],
});

const compileWithPreprocess: RootCompiler = (input, opts) => {
  const parser = compile(input, opts);
  const newParser: RootParser = (input, ctx) => {
    const pre = preprocessLight(input);
    const ret = parser(pre, ctx);
    return ret;
  };
  return newParser;
};

export { compileWithPreprocess as compile };

interface X {}

export function escapeWhistespace(input: string) {
  return input.replace(/[ ]{1,}/gmu, (text) => `@W${text.length}}`);
}

export function restoreEscaped(input: string, literals: Map<string, string>) {
  return input.replace(/@(W|L|N)(\d+)\}/, (full, type, $2) => {});
}

export function main() {
  const compilers = [compileTsc, compileMints];
  for (const compiler of compilers) {
    for (let i = 0; i < 3; i++) {
      const now = Date.now();
      const out = compiler(code);
      console.log(compiler.name, `[${i}]`, Date.now() - now);
      printPerfResult();
      console.log("raw:", out);
      console.log("----");
      console.log(prettier.format(out, { parser: "typescript" }));
    }
  }
}
main();

class _Point<Num extends number = number> {
  private z: Num = 0;
  constructor(private x: Num, private y: Num) {}
}


class X {
  async * f() {
      return 1;
  }
}

const itr = {
  async * [Symbol.asyncIterator]() {
      for (const c of []) {
          yield c;
      }
  },
};

function * f() {
  yield 1;
  yield 2;
}

type Unpacked<T> = T extends (infer U)[]
  ? U
  : T extends (...args: any[]) => infer U
  ? U
  : T extends Promise<infer U>
  ? U
  : T;