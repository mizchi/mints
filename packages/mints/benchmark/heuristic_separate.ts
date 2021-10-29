import fs from "fs";
import path from "path";

const code = `const x = 1;
1;
const x = 2;
`;
// pargen
// const code = fs.readFileSync(
//   path.join(__dirname, "cases/example4.ts"),
//   "utf-8"
// );

console.log(code.split(/(?=[\;\}])\n/gmu));
