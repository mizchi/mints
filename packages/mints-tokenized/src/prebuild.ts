import {
  SerializedAtom,
  SerializedEof,
  SerializedOr,
  SerializedRef,
  SerializedSeqObject,
} from "./../../pargen-tokenized/src/types";
// import "./index";
import * as grammar from "./grammar";
console.log(Object.keys(grammar));

// import { createSerializer } from "../../pargen-tokenized/src/serializer";
import { $dump } from "../../pargen-tokenized/src/builder";
import {
  Rule,
  SerializedAny,
  SerializedNot,
  SerializedRegex,
  SerializedRepeat,
  SerializedRule,
  SerializedSeq,
  SerializedToken,
} from "../../pargen-tokenized/src/types";
import {
  RULE_ANY,
  RULE_ATOM,
  RULE_EOF,
  RULE_NOT,
  RULE_OR,
  RULE_REF,
  RULE_REGEX,
  RULE_REPEAT,
  RULE_SEQ,
  RULE_SEQ_OBJECT,
  RULE_TOKEN,
} from "../../pargen-tokenized/src/constants";

// const NULL_FUNCTION_PTR = 0;
const NULL_STRING_PTR = 0;
const NULL = 0;

// WIP
// export function createSerializer() {
// let funcPtr = 1;
// const funcMap = new Map<Function, number>();
// function addFunc(s: Function | null | void) {
//   if (s == null) return NULL_FUNCTION_PTR;
//   if (funcMap.has(s)) {
//     return funcMap.get(s)!;
//   }
//   const id = funcPtr++;
//   funcMap.set(s, id);
//   return id;
// }

let stringPtr = 1;
const stringMap = new Map<string, number>();
function addString(s: string | null | void) {
  if (s == null) return NULL_STRING_PTR;
  if (stringMap.has(s)) {
    return stringMap.get(s)!;
  }
  const id = stringPtr++;
  stringMap.set(s, id);
  return id;
}

// const NULL_STRING_PTR = 0;
let childrenPtr = 1;
const childrenMap = new Map<number, number[]>();
function addChildren(childrenIds: number[]) {
  const id = childrenPtr++;
  childrenMap.set(id, childrenIds);
  return id;
}
let _id = 1;
const id = () => _id++;

const rules: SerializedRule[] = [];
const addRule = (rule: SerializedRule) => {
  if (Math.max(...(rule as any)) > 255) {
    // console.error("too many rules");
    console.log(rule);
    throw new Error("too many rules");
  }
  // @ts-ignore
  // rule = [...rule, ...Array(8 - rule.length).fill(0)];
  rules.push(rule);
  // console.log("push", rule);
  return id();
};

const encode = () => {
  return rules;
  // return JSON.stringify(rules);
};

const SIZE = 2 ** 8;
const twoBytes = (x: number): [number, number] => {
  const id1 = Math.floor(x / SIZE);
  const id2 = x % SIZE;
  return [id1, id2];
};

const serialize = (rule: Rule, refId: number): number => {
  // node base flags
  // const flags = (rule.opt ? 0b1 : 0) + (node.skip ? 0b10 : 0);
  // const body: SerializedRuleBody = [
  //   node.id,
  //   // flags,
  //   // addString(node.key),
  //   addFunc(undefined),
  //   // addFunc(node.reshape),
  // ];
  // console.log("s", rule);

  const SIZE = 2 ** 8;
  const [id1, id2] = twoBytes(rule.id);
  // const id1 = Math.floor(rule.id / SIZE);
  // const id2 = rule.id % SIZE;
  switch (rule.kind) {
    case RULE_TOKEN: {
      const s = [
        rule.kind,
        id1,
        id2,
        addString(rule.expr),
        NULL,
      ] as SerializedToken;
      return addRule(s);
    }
    case RULE_REGEX: {
      const s = [
        rule.kind,
        id1,
        id2,
        addString(rule.expr.toString()),
        NULL,
      ] as SerializedRegex;
      return addRule(s);
    }
    case RULE_SEQ: {
      const s = [
        rule.kind,
        id1,
        id2,
        ...twoBytes(
          addChildren(rule.children.map((x) => serialize(x as Rule, refId)))
        ),
        NULL,
      ] as SerializedSeq;
      return addRule(s);
    }
    case RULE_SEQ_OBJECT: {
      const s = [
        rule.kind,
        id1,
        id2,
        ...twoBytes(
          addChildren(rule.children.map((x) => serialize(x as Rule, refId)))
        ),
        NULL,
      ] as SerializedSeqObject;
      return addRule(s);
    }

    case RULE_ANY: {
      const s = [rule.kind, id1, id2, rule.len, NULL] as SerializedAny;
      return addRule(s);
    }
    case RULE_REPEAT: {
      const childPtr = serialize(rule.pattern as Rule, refId);
      const cid1 = Math.floor(childPtr / SIZE);
      const cid2 = childPtr % SIZE;
      const s = [
        rule.kind,
        id1,
        id2,
        cid1,
        cid2,
        NULL,
        NULL,
      ] as SerializedRepeat;
      return addRule(s);
    }
    case RULE_EOF: {
      const s = [rule.kind, id1, id2] as SerializedEof;
      return addRule(s);
    }

    case RULE_OR: {
      const children = rule.patterns.map((p) => serialize(p, refId));
      const childrenPtr = addChildren(children);
      const s = [rule.kind, id1, id2, ...twoBytes(childrenPtr)] as SerializedOr;
      return addRule(s);
    }
    case RULE_ATOM: {
      const s = [rule.kind, id1, id2, NULL] as SerializedAtom;
      return addRule(s);
    }
    case RULE_REF: {
      const s = [rule.kind, id1, id2, rule.ref, NULL] as SerializedRef;
      return addRule(s);
    }
    case RULE_NOT: {
      const children = rule.patterns.map((p) => serialize(p, refId));
      const childrenPtr = addChildren(children);
      const s = [
        rule.kind,
        id1,
        id2,
        ...twoBytes(childrenPtr),
      ] as SerializedNot;
      return addRule(s);
    }
    default: {
      // @ts-expect-error
      throw new Error(`Unsupported node kind: ${rule.kind}`);
    }
  }
};

import zlib from "zlib";

const dumpped = $dump();
const dumppedRaw = JSON.stringify(dumpped);
// console.log("dump", dumppedRaw + "bytes");
console.log("dump:deflate", zlib.deflateSync(dumppedRaw).length + "bytes");

for (const [id, rule] of Object.entries(dumpped)) {
  serialize(rule, parseInt(id));
}
const encoded = encode();
// console.log("encode", encoded);

// @ts-ignore
console.log("max id", Math.max(...encoded.flat(Infinity)));

const buf = new Uint8Array(encoded.flat(2));
// console.log("raw:", buf.byteLength / 1024 + "kb");

const gzipped = zlib.deflateSync(buf);
console.log("gzipped", gzipped.byteLength / 1024 + "kb");
// console.log("gzipped", gzipped);
console.log("string", JSON.stringify([...stringMap]).length / 1024);
