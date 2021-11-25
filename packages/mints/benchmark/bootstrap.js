// import { transform } from "./src/prebuild/index";
console.time("load");
const { transform } = require("../dist/index.cjs");
console.timeEnd("load");

console.time("run1");
const out = transform("const x: number = 1;");
console.log(out);
console.timeEnd("run1");

console.time("run2");
const out2 = transform("const x: number = 1;");
// console.log(out2);
console.timeEnd("run2");
