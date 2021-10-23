// @ts-ignore
import { transform, reportError } from "../dist/index.js";
console.log(transform("export const x: number = 1;"));

const errorCode = `const let:number`;

console.log(reportError(errorCode, transform(errorCode)));
