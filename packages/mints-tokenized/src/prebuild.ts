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
  rules.push(rule);
  // console.log("push", rule);
  return id();
};

const encode = () => {
  return rules;
  // return JSON.stringify(rules);
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

  const SIZE = 8;
  const id1 = Math.floor(rule.id / SIZE);
  const id2 = rule.id % SIZE;
  switch (rule.kind) {
    case RULE_TOKEN: {
      const s = [
        rule.id,
        rule.kind,
        addString(rule.expr),
        NULL,
      ] as SerializedToken;
      return addRule(s);
    }
    case RULE_REGEX: {
      const s = [
        rule.id,
        rule.kind,
        addString(rule.expr.toString()),
        NULL,
      ] as SerializedRegex;
      return addRule(s);
    }
    case RULE_SEQ: {
      const s = [
        rule.id,
        rule.kind,
        addChildren(rule.children.map((x) => serialize(x as Rule, refId))),
        NULL,
      ] as SerializedSeq;
      return addRule(s);
    }
    case RULE_ANY: {
      const s = [rule.id, rule.kind, rule.len, NULL] as SerializedAny;
      return addRule(s);
    }
    case RULE_REPEAT: {
      return [rule.id, rule.kind] as any;
    }
    case RULE_SEQ_OBJECT: {
      return [rule.id, rule.kind] as any;
    }
    case RULE_EOF: {
      return [rule.id, rule.kind] as any;
    }

    case RULE_OR: {
      return [rule.id, rule.kind] as any;
    }

    case RULE_ATOM: {
      return [rule.id, rule.kind] as any;
    }

    case RULE_REF: {
      return [rule.id, rule.kind] as any;
    }
    case RULE_NOT: {
      return [rule.id, rule.kind] as any;
    }
    default: {
      // @ts-expect-error
      throw new Error(`Unsupported node kind: ${rule.kind}`);
    }
  }
};
// return { serialize, stringMap, encode };
// }

// const { serialize, stringMap, encode } = createSerializer();

// console.log($dump());

const dumpped = $dump();

for (const [id, rule] of Object.entries(dumpped)) {
  serialize(rule, parseInt(id));
}
const encoded = encode();
// console.log("encode", encoded);

// @ts-ignore
console.log("max id", Math.max(...encoded.flat(Infinity)));
console.log("bytes", new Uint8Array(encoded.flat(2)).byteLength);
