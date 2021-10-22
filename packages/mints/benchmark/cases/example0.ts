// , b: number[], c: Array<string>;
const x: number = 1;

let a,b,c;

function square(x: number): number {
  return x ** 2;
};

square(2);

type IPoint = {
  x: number;
  y: number;
};

if (1) {
  1;
} else {
  while(false) {}
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

// func<T>();

export { x, x as y, p };

export const v = 1;

export class Foo {
  x: number = 1;
};

// console.log("aaa");

const el = document.querySelector("#app");console.log("el", el);

// const querySelector = "1";

// declare const foo: any;