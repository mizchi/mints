import { transform } from "../src/index";
import ts from "typescript";
import fs from "fs";

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
  return transform(input).result as string;
}

export function main() {
  const compilers = [compileTsc, compileMints];

  for (const compiler of compilers) {
    for (let i = 0; i < 5; i++) {
      const now = Date.now();
      compiler(code);
      console.log(compiler.name, `[${i}]`, Date.now() - now);
    }
  }
}
main();
