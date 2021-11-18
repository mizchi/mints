import ts from "typescript";
import fs from "fs";
import path from "path";
import esbuild_ from "esbuild";
import { createTransformer } from "../node/node_main";
import { transform as sucraseTransform } from "sucrase";
// import { transform } from "../src/index";
import { transform } from "../src/runtime";

const N = 1;

const code_scratch = fs.readFileSync(
  path.join(__dirname, "cases/_scratch.ts"),
  "utf-8"
);

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
// const code5 = fs.readFileSync(
//   path.join(__dirname, "cases/example5.ts"),
//   "utf-8"
// );

function tsc(input: string) {
  return ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.Latest,
    },
  }).outputText;
}

function sucrase(input: string) {
  return sucraseTransform(input, { transforms: ["jsx", "typescript"] }).code;
}

async function esbuild(input: string) {
  const x = await esbuild_.transform(input, {
    loader: "ts",
  });
  return x.code;
}

function mints(input: string) {
  const out = transform(input);
  if (typeof out === "object") {
    throw out;
  }
  return out as string;
}

const transformer = createTransformer();
process.on("exit", () => transformer.terminate());

async function mints_para(input: string) {
  const out = await transformer.transform(input);
  if (typeof out === "object") {
    throw out;
  }
  return out as string;
}

export async function main() {
  const compilers = [tsc, sucrase, esbuild, mints, mints_para];

  // const targets = [code1, code2, code3];
  // const targets = [code_scratch];
  const targets = [code0, code1, code2, code3, code4];

  // check mints can parse all
  console.log("=== mints-check");
  for (const target of targets) {
    const out = mints(target);
    console.log("pass", JSON.stringify(target.slice(0, 10)) + "...");
    // console.log("output", out);
  }
  // throw "stop";

  console.log("=== perf start");
  for (const code of targets) {
    const caseName = "example:" + targets.indexOf(code);
    console.log("---------", caseName);
    for (const compiler of compilers) {
      const results: number[] = [];
      for (let i = 0; i < N; i++) {
        const now = Date.now();
        // console.log("bench", code);
        const out = await compiler(code);
        results.push(Date.now() - now);
      }
      console.log(
        `[${compiler.name}]`,
        Math.floor(results.reduce((s, n) => s + n, 0) / results.length) + "ms"
      );
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
