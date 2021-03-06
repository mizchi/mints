import { line } from "./grammar";
import { compile } from "./ctx";
import { parseTokens } from "../runtime/tokenizer";

const parse = compile(line);

function processLine(tokens: string[], opts: any): string {
  if (tokens.length === 0) return "";
  const parsed = parse(tokens.slice(), opts);
  if (parsed.error) {
    throw new Error(JSON.stringify(parsed, null, 2));
  } else {
    const s = parsed.xs
      .map((r) => (typeof r === "string" ? r : tokens[r]))
      .join("");
    return s;
  }
}

export function transform(
  input: string,
  opts?: { jsx?: string; jsxFragment?: string }
) {
  if (!opts) {
    opts = detectInlineOptions(input);
    opts.jsx ??= "React.createElement";
    opts.jsxFragment ??= "React.Fragment";
  }
  let tokens: string[] = [];
  let results: string[] = [];
  for (const t of parseTokens(input)) {
    if (t === "\n") {
      results.push(processLine(tokens.slice(), opts));
      tokens = [];
    } else {
      tokens.push(t);
    }
  }
  return results.join("");
}

import { run, test, is } from "@mizchi/test";
import { detectInlineOptions } from "../runtime/options";
const isMain = require.main === module;
// import ts from "typescript";
if (process.env.NODE_ENV === "test") {
  const ts = require("typescript");
  const prettier = require("prettier");

  const _transpileTscWithPrettier = (input: string) => {
    const js = ts.transpileModule(input, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.Latest,
        removeComments: true,
      },
    }).outputText;
    return prettier.format(js, { parser: "typescript" });
  };

  const expectTransformSuccess = (inputs: string[]) => {
    for (const i of inputs) {
      const transformed = prettier.format(transform(i), {
        parser: "typescript",
      });
      is(transformed, _transpileTscWithPrettier(i));
    }
  };

  const now = Date.now();

  test("multiline", () => {
    is(transform(`1;`), "1;");
    is(transform(`debugger;debugger;`), "debugger;debugger;");
    is(transform("class{};1;"), "class{};1;");
    is(transform(`function f(){};1;2;`), "function f(){};1;2;");
    is(transform(`x=class{};function f(){}`), "x=class{};function f(){}");
    is(
      transform(`class{
        a = 1;
        b = 2;
        c = 3;
      }`),
      "class{a=1;b=2;c=3;}"
    );
  });

  test("multiline program control", () => {
    // is(transform(`1;2;3;`), "1;2;3;");
    console.log([...parseTokens(`input.replace(/[ ]{1,}/gmu, '');`)]);
    // is(transform(`throw new Error('xxx');`), "throw new Error('xxx');");

    // const parse = compile(program, { end: true });
    expectTransformSuccess([
      "export default 1;",
      `;`,
      `;;;;;`,
      `a;`,
      `a;\n`,
      `if(1){}`,
      `if(1){}\na;`,
      `1;class C{}`,
      `1;class C{}\nclass D{}\nif(1){}`,
      `a;b;`,
      `class {};a;b;`,
      `a;\n\n`,
      `    a;`,
      ` \n \n a;`,
      ` \n \n a; \n b;`,
      ` \n \n a; \n b;`,
      ` \n \n a; \n class{}\na;`,
      `class{}\na;class{}\n\nb;`,
      `class{};a;`,
      `class{}\na;`,
      `class{}\n`,
      `class F{}\n;`,
      `class{};\n;`,
      `class{}\na;`,
      `class{}\n\na;`,
      `class{};\na;`,
      `class{}\n;\na;`,
      `if(1){}\na;`,
      `if(1){};a;`,
      `if(1){}\n;a;`,
      `if(1){}\n;\na;`,
      `if(1){}\n\na;`,
      `if(1){} else {}\n\na;`,
      `if(1){} else {}\na;`,
      `type X = { xxx: number };`,
      `type X = { xxx?: number };`,
      "f(() => 1);",
      "f(1, () => {});",
      "f(1, (a) => {});",
      "f(1, (a,b) => {});",
      "f(1, (a,b,c) => {});",
      // `function f(){
      //   return input.replace(/@(W|L|N)(\d+)\}/, (full, x, y) => {});
      // }`,
      `function _formatError(depth: number) {}`,
      // `function _formatError(depth: number = 0) {}`,
      `"".foo;`,
      //       //     `/x/.exec`,
      `f(1, 2, 3);`,
      `new Error();`,
      `new A.b();`,
      // `throw new Error();`,
      `function a(_){}`,
      `class X{
                public foo(x, {}: {} = {}){}
              }`,
      `class X{
                foo(x,){}
              }`,
      `class X{
          public async foobar(x, {}: {} = {}){}
        }`,
      `({...a, ...b});`,
      `f({\n });`,
      `function f(a={\n }){}`,
      `class{f(a={\n}){}}`,
      `class{f(a={\n}){\n}}`,
      `class{f(a={\n\n}){}}`,
      `class{f(a={a:1}){}}`,
      `class{f(a={a:1,b:1}){}}`,
      `class{f(a={a:1\n,b:\n1}){}}`,
      `class{f(a={a:1\n,b:\n1,\n}){}}`,
      // `class{f(a={\na:1\n,b:\n1,\n}){}}`,
      `class{f(a={ a:1\n,b:\n1,\n}){}}`,
      `class{f(a={ a:1\n,b:\n1,\n}){}}`,
      // `class{f(a={\n a,}){}}`,
      `class{f(a={ a }){}}`,
      `class{f(a={ a: 1}){}}`,
      // `class{f(a={ a(){}}){}}`,
      `class{f(a={\n}){}}`,

      `class{f(x,){}}`,
      `class{f(x,\n){}}`,
      `class{f(x, ){}}`,
      `class{f(x, \n){}}`,
      `function foo(x,\n ){}`,
      `class{f(x, \n){}}`,
      `class{f(x,\n ){}}`,
      `f(()=>g);`,
      `f(a=>g);`,
      `f(()=>\ng);`,
      `if (process.env.NODE_ENV === "test") {
              // xxx
              }
              `,
      `importS;`,
      `[...XS,...YS,];`,
      `(x: number, y?: number) => {};`,
      `class{f(x?:T){}}`,
      `try{}catch(e){}`,
      `try{}catch{}`,
      `try{}catch(e){}finally{}`,
      `try{}finally{}`,
      `switch(1){case a:1;1;case b:2;2;default: 1}`,
      `switch(1){case a:{};case 1:break;default: 1;break;}`,
      `switch (1 as number) {
                case 1:
                  try {} catch (error) {}
                case 2:
              }`,
      `f(''+\n'b');`,
      `input.replace(/[ ]{1,}/gmu, '');`,
      `throw new Error('xxx');`,
      `function e(i) { b
  .replace(/{\\n1,}/gmu, (text) => \`@N\${text.length}}\`);
  }`,
    ]);
    is(
      transform(`enum X { a = "foo", b = "bar" }`),
      `const X={a:"foo",b:"bar",};`
    );
    // export default 1;
  });

  test("default", () => {
    is(transform(`export default 1;`), `export default 1;`);

    is(
      transform(`export const x = 1;export default 1;`),
      `export const x=1;export default 1;`
    );
  });

  test("type", () => {
    is(transform(`export type a = x;`), `;`);
  });

  test("jsx: no pragma", () => {
    const code = `const el = <div>1</div>;`;
    const result = transform(code);
    is(result, `const el=React.createElement("div",{},"1");`);
  });

  test("jsx: with pragma", () => {
    const code = `/* @jsx h */\nconst el = <div></div>;`;
    const result = transform(code);
    is(result, `const el=h("div",{});`);
  });

  run({ stopOnFail: true, stub: true, isMain }).then(() => {
    console.log("[test:time]", Date.now() - now);
  });
}
