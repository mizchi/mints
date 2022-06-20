/* @jsx h */
// @ts-ignore
import { h, render } from "https://cdn.skypack.dev/preact";

// support enum
enum Keys {
  A = 1,
  B,
}

// support jsx
function App() {
  return <div>Hello World</div>;
}
render(<App />, document.body);

// types
const x: number = 1;
function square(x: number): number {
  return x ** 2;
}

type T = any;
declare const _hidden: number;

class Point<Num extends number = number> {
  private z: Number = 0;
  constructor(private x: Num, private y: Num) {}
}

console.log(new Point<1 | 2>(1, 2));
