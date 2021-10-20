import { transform } from "../src/index";
import ts from "typescript";
import fs from "fs";
import { printPerfResult } from "@mizchi/pargen/src";

const code = fs.readFileSync(__dirname + "/cases/example0.ts", "utf-8");

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
    throw out;
  }
  return out.result as string;
}

export function main() {
  const compilers = [
    // xx
    // compileTsc,
    compileMints,
  ];

  for (const compiler of compilers) {
    for (let i = 0; i < 1; i++) {
      const now = Date.now();
      const out = compiler(code);
      console.log(compiler.name, `[${i}]`, Date.now() - now);
      printPerfResult();
      console.log(out);
    }
  }
}
main();
