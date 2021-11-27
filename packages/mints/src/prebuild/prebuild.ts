// import assert from "assert";
import { createSnapshot } from "../../../pargen-tokenized/src/index";
import { encodeSnapshotToBinary } from "../../../pargen-tokenized/encoder/encoder";
import { line } from "./grammar";
import fs from "fs";
import path from "path";
import { E_strings } from "../../../pargen-tokenized/src/constants";
import { CONTROL_TOKENS, RESERVED_WORDS } from "./constants";

const snapshot = createSnapshot(line);
const strings = snapshot[E_strings];
const serialized = encodeSnapshotToBinary(snapshot);

fs.writeFileSync(
  path.join(__dirname, "../runtime/snapshot_b64.ts"),
  `export const snapshot = '${Buffer.from(serialized).toString("base64")}';`
);

// console.log("c", controlTokens, reservedWords);
const controlTokens = CONTROL_TOKENS.map((x) => {
  const strPtr = strings.indexOf(x);
  if (strPtr > -1) {
    return strPtr;
  }
  const id = strings.length;
  // strings.push(x);
  return id;
});

const reservedWords = RESERVED_WORDS.map((x) => {
  const idx = strings.indexOf(x);
  if (idx > -1) {
    return idx;
  }
  // console.log("push rw", x);
  const id = strings.length;
  strings.push(x);
  return id;
});

fs.writeFileSync(
  path.join(__dirname, "../runtime/strings.json"),
  JSON.stringify(strings)
);

const rw = [...new Set([...reservedWords, ...controlTokens])].sort(
  (a, b) => a - b
);
fs.writeFileSync(
  path.join(__dirname, "../runtime/reserved.json"),
  JSON.stringify(rw)
);
