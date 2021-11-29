// import assert from "assert";
import { createSnapshot } from "../../../pargen-tokenized/src/index";
import { encodeSnapshotToBinary } from "../../../pargen-tokenized/encoder/encoder";
import { E_strings } from "../../../pargen-tokenized/src/constants";
import { line } from "./grammar";

import fs from "fs";
import path from "path";
import { RESERVED_WORDS } from "./constants";
import { CONTROL_TOKENS } from "../runtime/tokenizer";

const snapshot = createSnapshot(line);
const strings = snapshot[E_strings];
const serialized = encodeSnapshotToBinary(snapshot);

fs.writeFileSync(
  path.join(__dirname, "../runtime/snapshot_b64.ts"),
  `export const snapshot = '${Buffer.from(serialized).toString("base64")}';`
);

fs.writeFileSync(
  path.join(__dirname, "../runtime/__strings.json"),
  JSON.stringify(strings)
);
console.log("gen>", "src/runtime/__strings.json");

// console.log("c", controlTokens, reservedWords);
const controlTokens = CONTROL_TOKENS.map((x) => {
  const strPtr = strings.indexOf(x);
  if (strPtr > -1) {
    return strPtr;
  }
  const id = strings.length;
  strings.push(x);
  return id;
});

const reservedWords = RESERVED_WORDS.map((x) => {
  const idx = strings.indexOf(x);
  if (idx > -1) return idx;
  const id = strings.length;
  strings.push(x);
  return id;
});

const rw = [...new Set([...reservedWords, ...controlTokens])].sort(
  (a, b) => a - b
);

console.log("rw");
fs.writeFileSync(
  path.join(__dirname, "../runtime/__reserved.json"),
  JSON.stringify(rw)
);
console.log("gen>", "src/runtime/__reserved.json");
