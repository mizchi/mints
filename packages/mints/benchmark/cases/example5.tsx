/* @jsx h */
import { h, render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
// import { wrap } from "comlink";
// import type { TokenizerApi } from "./tokenize-worker";
// @ts-ignore
import { transformSync } from "@mizchi/mints/dist/index.js";
// @ts-ignore
// import TokenizeWorker from "./tokenize-worker?worker";

// const api = wrap<TokenizerApi>(new TokenizeWorker());

console.time("ui");
console.time("first-compile");

const initialCode = `hello`;

let timeout: any = null;
let firstCompileDone = false;

function App() {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [buildTime, setBuildTime] = useState(0);
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    try {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(
        async () => {
          timeout = null;
          const now = Date.now();
          // const out = await api.transform(code);
          const out = await transformSync(code);
          // @ts-ignore
          if (out.error) {
            setOutput(JSON.stringify(out, null, 2));
          } else {
            setBuildTime(Date.now() - now);
            setOutput(out);
            if (!firstCompileDone) {
              firstCompileDone = true;
              console.timeEnd("first-compile");
              console.log("first compile ends at", performance.now());
            }
          }
        },
        firstCompileDone ? 400 : 0
      );
    } catch (err) {
      console.error(err);
    }
  }, [code, setCode, setOutput, setBuildTime]);
  const onClickRun = useCallback(() => {
    if (ref.current == null) return;
    const encoded = btoa(unescape(encodeURIComponent(output)));
    const blob = new Blob(
      [
        `<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
  <script type=module>
    console.log("start in ifarme");
    import("data:text/javascript;base64,${encoded}");
  </script>
  </body>
</html>`,
      ],
      { type: "text/html" }
    );
    ref.current.src = URL.createObjectURL(blob);
  }, [output, ref]);
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
          <h3>Mints Playground</h3>
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
              // console.log("changed", ev.target.value);
              setCode(ev.target.value);
            }}
          />
        </div>
      </div>
      <div style={{ flex: 1, height: "100%" }}>
        <div style={{ height: "20vh", width: "45vw", position: "relative" }}>
          <button
            onClick={onClickRun}
            style={{
              padding: 5,
              position: "absolute",
              right: 0,
              top: 0,
            }}
          >
            Run
          </button>
          <iframe
            sandbox="allow-scripts"
            ref={ref}
            style={{ width: "100%", height: "100%", background: "white" }}
          />
        </div>
        <div style={{ flex: 1, paddingTop: 10 }}>
          <div>BuildTime: {buildTime}ms</div>
          <pre>
            <code style={{ whiteSpace: "pre-wrap" }}>{output}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

render(<App />, document.body);
console.timeEnd("ui");
