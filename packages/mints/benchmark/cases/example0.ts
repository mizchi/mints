let a: number, b: number[], c: Array<string>;
const x: number = 1;

function square(x: number): number {
  return x ** 2;
}

// type IPoint = {
//   x: number;
//   y: number;
// };
// interface X {}

class Point<T extends IPoint = any> implements IPoint {
  public x: number;
  private y: number;
  constructor() {
    this.x = 1;
    this.y = 2;
  }
  public static async foo(arg: number): number {
    return arg;
  }
}

const p = new Point();

// func<T>();
