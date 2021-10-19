/* @jsx h */
import { h, render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { wrap } from "comlink";
import type { Api } from "./worker";
// @ts-ignore
import Worker from "./worker?worker";
const api = wrap<Api>(new Worker());

const initialCode = `// typescript

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
  public static async foo(arg: number):  number {
    return x;
  }
}

// function call with type parameter
func<T>();
`;

let timeout: any = null;
function App() {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [buildTime, setBuildTime] = useState(0);

  useEffect(() => {
    try {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        timeout = null;
        const now = Date.now();
        const out = await api.transform(code);
        if (out.error) {
          setOutput(JSON.stringify(out, null, 2));
        } else {
          setBuildTime(Date.now() - now);
          setOutput(out.result as string);
        }
      }, 500);
    } catch (err) {
      console.error(err);
    }
  }, [code, setCode, setOutput, setBuildTime]);
  return (
    <div style={{ display: "flex", width: "100vw", hegiht: "100vh" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          height: "100%",
          flexDirection: "column",
        }}
      >
        <div style={{ height: "100%", width: "100%", paddingLeft: 15 }}>
          <h3>Mints Playground (WIP: 5kb typescript compiler)</h3>
          <div>
            by{" "}
            <a href="https://twitter.com/mizchi" style={{ color: "#89f" }}>
              @mizchi
            </a>
          </div>
        </div>
        <div style={{ flex: 1, padding: 10 }}>
          <textarea
            style={{ paddingLeft: 10, width: "45vw", height: "80vh" }}
            value={code}
            onInput={(ev: any) => {
              console.log("changed", ev.target.value);
              setCode(ev.target.value);
            }}
          />
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <h3>Output: {code.length}</h3>
        <div>BuildTime: {buildTime}</div>
        <pre>
          <code>{output}</code>
        </pre>
      </div>
    </div>
  );
}

render(<App />, document.body);
