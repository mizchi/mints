import { transform } from "../src/index";
import ts from "typescript";
import fs from "fs";
import { printPerfResult } from "@mizchi/pargen/src";
import { formatError } from "../src/_testHelpers";
import prettier from "prettier";
import { preprocess, preprocessLight } from "../src/preprocess";

const code1 = fs.readFileSync(__dirname + "/cases/example0.ts", "utf-8");
const code2 = fs.readFileSync(__dirname + "/cases/example1.ts", "utf-8");

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
    formatError(code1, out);
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

  for (const code of [code1, code2]) {
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
