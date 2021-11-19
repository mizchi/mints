// import assert from "assert";
import { createSnapshot } from "../../../pargen-tokenized/src/index";
import { line } from "./grammar";
import { encode, decode } from "./cbor";

const snapshot = createSnapshot(line);
const strings = snapshot[E_strings];

const toArray = (xs: { [key: string]: number | number[] }) =>
  Object.entries(xs).map(([k, v]) => [parseInt(k), v]);
// array 5~6
const newSnapshot = [
  snapshot[E_entryRefId],
  snapshot[E_rules],
  snapshot[E_values],
  snapshot[E_refs],
  snapshot[E_cidsList],
  toArray(snapshot[E_reshapes]),
  toArray(snapshot[E_reshapeEachs]),
  toArray(snapshot[E_flagsList]),
  toArray(snapshot[E_keyList]),
  toArray(snapshot[E_popList]),
];
const serialized = encode(newSnapshot);

import fs from "fs";
import path from "path";
import {
  E_cidsList,
  E_entryRefId,
  E_flagsList,
  E_keyList,
  E_popList,
  E_refs,
  E_reshapeEachs,
  E_reshapes,
  E_rules,
  E_strings,
  E_values,
} from "../../../pargen-tokenized/src/constants";
import { CONTROL_TOKENS, RESERVED_WORDS } from "./constants";

fs.writeFileSync(
  path.join(__dirname, "../runtime/snapshot.bin"),
  Buffer.from(serialized)
);

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
  // console.log("push!", x);
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

// const controlTokens = CONTROL_TOKENS.map(x => strings.indexOf(x))

// if (require.main === module) {
//   console.time("decode");
//   const decoded = decode(serialized);
//   const d = Object.fromEntries;
//   const decodedSnapshot = {
//     entryRefId: decoded[0],
//     rules: decoded[1],
//     values: decoded[2],
//     refs: decoded[3],
//     cidsList: decoded[4],
//     reshapes: d(decoded[5]),
//     reshapeEachs: d(decoded[6]),
//     flagsList: d(decoded[7]),
//     keyList: d(decoded[8]),
//     popList: d(decoded[9]),
//   };

//   console.timeEnd("decode");
//   assert.deepStrictEqual(decodedSnapshot, snapshot);
// }
