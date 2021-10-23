import { transform } from "../src/index";
import ts from "typescript";
import fs from "fs";
import path from "path";
import { printPerfResult } from "@mizchi/pargen/src";
// import { formatError } from "../src/_testHelpers";
import prettier from "prettier";
import { preprocess, preprocessLight } from "../src/preprocess";
import { reportError } from "../src/error_reporter";

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
    reportError(input, out);
    throw out;
  }
  return out.result as string;
}

export function main() {
  const compilers = [
    // xx
    compileTsc,
    compileMints,
  ];

  // const targets = [code1, code2, code3];
  const targets = [code0, code1, code2];

  for (const code of targets) {
    for (const compiler of compilers) {
      // console.log("[pre]", preprocessLight(code));
      for (let i = 0; i < 2; i++) {
        const now = Date.now();
        const out = compiler(code);
        console.log(compiler.name, `[${i}]`, Date.now() - now);
        // printPerfResult();
        // console.log("raw:", out);
        // console.log("----");
        // console.log(prettier.format(out, { parser: "typescript" }));
      }
    }
  }
}
main();
