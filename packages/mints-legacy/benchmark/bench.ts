import { transform } from "../src/index";
import ts from "typescript";
import fs from "fs";
import path from "path";
import { printPerfResult } from "@mizchi/pargen/src";
// import { formatError } from "../src/_testHelpers";
// import prettier from "prettier";

const code0 = fs.readFileSync(
  path.join(__dirname, "cases/example0.ts"),
  "utf-8"
);

const code1 = fs.readFileSync(
  path.join(__dirname, "cases/example1.ts"),
  "utf-8"
);
// pargen
const code2 = fs.readFileSync(
  path.join(__dirname, "cases/example2.ts"),
  "utf-8"
);

// pargen
const code3 = fs.readFileSync(
  path.join(__dirname, "cases/example3.ts"),
  "utf-8"
);

// pargen
const code4 = fs.readFileSync(
  path.join(__dirname, "cases/example4.ts"),
  "utf-8"
);

// pargen
const code5 = fs.readFileSync(
  path.join(__dirname, "cases/example5.ts"),
  "utf-8"
);

function compileTsc(input: string) {
  return ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.Latest,
    },
  }).outputText;
}

function compileMints(input: string) {
  const out = transform(input);
  if (out.error) {
    // out.reportErrorDetail();
    throw out;
  }
  return out.result as string;
}

export function main() {
  const compilers = [compileTsc, compileMints];

  // const targets = [code1, code2, code3];
  const targets = [
    // x
    code0,
    code1,
    code2,
    code3,
    // code4,
    // code5,
  ];

  for (const code of targets) {
    for (const compiler of compilers) {
      // console.log("[pre]", preprocessLight(code));
      const N = 2;
      for (let i = 0; i < N; i++) {
        const now = Date.now();
        const out = compiler(code);
        console.log(compiler.name, `[${i}]`, Date.now() - now);
        if (i === N - 1) {
          // console.log("[out]", out);
        }
        // console.log("raw:", out);
        // console.log("----");
        // console.log(prettier.format(out, { parser: "typescript" }));
      }
      if (process.env.NODE_ENV === "perf" && compiler === compileMints) {
        printPerfResult();
      }
    }
  }
}
main();
