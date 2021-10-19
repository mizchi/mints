// typescript

// @ts-ignore
import { h, render } from "https://cdn.skypack.dev/preact";

let a: number, b: number[], c: Array<string>;
const x: number = 1;

// function
function square(x: number): number {
  return x ** 2;
}

// type interface will be deleted
type IPoint = {
  x: number;
  y: number;
};
interface X {}

// class implements
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

// function call with type parameter
func<T>();
