// import { transform } from '@mizchi/mints';
import { transform } from "../src/index";
import ts from "typescript";
import fs from "fs";
import path from "path";
import esbuild from "esbuild";
import { createTransformer } from "../node/node_main";
import { transform as sucraseTransform } from "sucrase";

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

async function esbuild_(input: string) {
  const x = await esbuild.transform(input, {
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
  const compilers = [tsc, mints, mints_para, sucrase, esbuild_];

  // const targets = [code1, code2, code3];
  // const targets = [code_scratch];
  const targets = [code0, code1, code2, code3, code4];

  // check mints can parse all
  for (const target of targets) {
    mints(target);
    console.log("mints pass", JSON.stringify(target.slice(0, 10)) + "...");
  }

  for (const code of targets) {
    const caseName = "example:" + targets.indexOf(code);
    console.log("---------", caseName);
    for (const compiler of compilers) {
      // console.log(`[${compiler.name}] start`);
      // console.log("[pre]", preprocessLight(code));
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
  // transformer.terminate();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
