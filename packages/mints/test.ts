import fs from "fs";
import { transformSync } from "./src/index";

const code = fs.readFileSync(
  __dirname + "/benchmark/cases/example6.tsx",
  "utf-8"
);

const cache = new Map();

console.time("1st");
const out = transformSync(code, { cache });
console.timeEnd("1st");

console.time("with cache");
const out2 = transformSync(code, { cache });
console.timeEnd("with cache");

// console.log(out.code);
