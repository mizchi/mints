import type { SeqChildRule } from "../pargen-tokenized/src/types";

export type u8 = number;

export type SerializedEof = [];
export type E_Atom = [funcPtr: u8];
export type E_Any = [len: u8];
export type E_Token = [stringPtr: u8];
export type E_Regex = [stringPtr: u8];
export type SerializedRef = [ref: u8];
export type SerializedNot = [childrenPtr: u8];
export type E_Seq = [childrenPtr: u8];
export type SerializedSeqObject = [childrenPtr: u8];
export type E_OR = [childPtr: u8];
export type E_Repeat = [patternPtr: u8];

export type EncodedRule =
  | E_Seq
  | E_Token
  | E_OR
  | E_Repeat
  | SerializedRef
  | SerializedEof
  | SerializedNot
  | E_Atom
  | E_Any
  | E_Atom
  | SerializedSeqObject
  | E_Regex;

import { $dump } from "../pargen-tokenized/src/builder";
import type { Rule } from "../pargen-tokenized/src/types";
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
} from "../pargen-tokenized/src/constants";

import ohash from "object-hash";

type E_ElementSizes = [
  // funcs_count: u8,
  // string_count: u8,
  seq_cids_count: u8,
  seqo_cids_count: u8,
  or_cids_count: u8,
  not_cids_count: u8
];

type E_RuleCount = [
  eof_count: 0,
  token_count: u8,
  ref_count: u8,
  any_count: u8,
  regex_count: u8,
  atom_count: u8,
  not_count: u8,
  or_count: u8,
  seq_count: u8,
  seqo_count: u8,
  repeat_count: u8
];

type E_Header = [...E_ElementSizes, ...E_RuleCount];

type E_SEQ_FLAGS = [rulePtr: u8, flags: u8];
type E_KEY = [rulePtr: u8, keyPtr: u8];
type E_POP = [rulePtr: u8, popPtr: u8];
type E_RESHAPE = [rulePtr: u8, funcPtr: u8];
type E_RESHAPE_EACH = [rulePtr: u8, funcPtr: u8];

const COUNT_ORDER = [
  RULE_EOF,
  RULE_TOKEN,
  RULE_REF,
  RULE_ANY,
  RULE_REGEX,
  RULE_ATOM,
  RULE_NOT,
  RULE_OR,
  RULE_SEQ,
  RULE_SEQ_OBJECT,
  RULE_REPEAT,
] as const;

require("./src/grammar");
// import * as grammar from "./src/grammar";
// Object.keys(grammar);

const CIDS_ORDER = [RULE_SEQ, RULE_SEQ_OBJECT, RULE_OR, RULE_NOT] as const;

class Encoder {
  #funcs: Function[] = [];
  #strings: string[] = [];
  #flags_list: Array<E_SEQ_FLAGS> = [];
  #pop_list: Array<E_POP> = [];
  #key_list: Array<E_KEY> = [];
  #reshape_list: Array<E_RESHAPE> = [];
  #reshape_each_list: Array<E_RESHAPE_EACH> = [];

  #cids: {
    [RULE_SEQ]: Array<u8[]>;
    [RULE_SEQ_OBJECT]: Array<u8[]>;
    [RULE_OR]: Array<u8[]>;
    [RULE_NOT]: Array<u8[]>;
  } = {
    [RULE_SEQ]: [],
    [RULE_SEQ_OBJECT]: [],
    [RULE_OR]: [],
    [RULE_NOT]: [],
  };

  #encodedRules: EncodedRule[] = [];
  #cachedRules = new Map<string, u8>();
  #usageCounter = new Map<number, number>();

  constructor() {
    for (const key of COUNT_ORDER) {
      this.#usageCounter.set(key, 0);
    }
  }

  public emitBuffer() {
    const ruleCounts = COUNT_ORDER.map((k) => {
      const n = this.#usageCounter.get(k)!;
      return n;
    }) as E_RuleCount;

    const stringBuffer = new TextEncoder().encode(this.#strings.join("\0"));

    let seq_cids_count = 0;
    let seqo_cids_count = 0;
    let or_cids_count = 0;
    let not_cids_count = 0;

    const e_cids_body = CIDS_ORDER.map((kind) => {
      const cidsList = this.#cids[kind].sort((a, b) => a.length - b.length);
      if (kind === RULE_SEQ) seq_cids_count = cidsList.length;
      if (kind === RULE_SEQ_OBJECT) seqo_cids_count = cidsList.length;
      if (kind === RULE_OR) or_cids_count = cidsList.length;
      if (kind === RULE_NOT) not_cids_count = cidsList.length;
      return cidsList.map((cids) => [cids.length, ...cids]).flat();
    }).flat();

    const elementSizes: E_ElementSizes = [
      seq_cids_count,
      seqo_cids_count,
      or_cids_count,
      not_cids_count,
    ];

    let header = [...elementSizes, ...ruleCounts];

    const buf = [
      header.length,
      ...header,
      // rules: 1 byte
      ...this.#encodedRules.flat(),
      // flags: 2 bytes
      ...this.#flags_list.flat(),
      // keys: 2 bytes
      ...this.#key_list.flat(),
      // pop: 2 bytes
      ...this.#pop_list.flat(),
      // children ids
      ...e_cids_body,
      // strings
      ...stringBuffer,
    ] as u8[];

    for (let p of buf) {
      if (p > 255) {
        throw new Error("buffer overflow");
      }
    }
    return new Uint8Array(buf);
  }

  public registerRule(rule: Rule): number {
    switch (rule.t) {
      case RULE_TOKEN:
      case RULE_REGEX:
      case RULE_ATOM:
      case RULE_REF:
      case RULE_ANY:
        return this.#addRule(rule, [rule.c] as EncodedRule);
      case RULE_NOT:
      case RULE_OR: {
        const cidsPtr = this.#addChildren(
          rule.t,
          rule.c.map(this.registerRule.bind(this))
        );
        return this.#addRule(rule, [cidsPtr] as EncodedRule);
      }
      case RULE_SEQ:
      case RULE_SEQ_OBJECT: {
        const cids = rule.c.map((child) => {
          const rulePtr = this.registerRule(child as Rule);
          this.#addSeqChildParams(rulePtr, child);
          return rulePtr;
        });
        const s = [this.#addChildren(rule.t, cids)] as EncodedRule;
        return this.#addRule(rule, s);
      }
      case RULE_REPEAT: {
        const childPtr = this.registerRule(rule.c);
        const rulePtr = this.#addRule(rule, [childPtr] as E_Repeat);
        if (rule.e)
          this.#reshape_each_list.push([rulePtr, this.#addFunc(rule.e)]);
        return rulePtr;
      }
      case RULE_EOF:
      default: {
        throw new Error(`Unsupported node kind: ${rule.t}`);
      }
    }
  }

  #incrementUsage(rule: Rule) {
    this.#usageCounter.set(rule.t, this.#usageCounter.get(rule.t)! + 1);
  }

  #addRule(rule: Rule, encoded: EncodedRule): u8 {
    const hash = ohash(encoded);
    if (this.#cachedRules.has(hash)) {
      return this.#cachedRules.get(hash)!;
    }
    if (Math.max(...encoded) > 255) {
      console.log("or", this.#cids[RULE_OR].length);
      console.log("seq", this.#cids[RULE_SEQ].length);
      throw new Error(`too many rules: ${JSON.stringify(encoded)}`);
    }
    const rulePtr = this.#encodedRules.length;

    // update cache
    this.#encodedRules.push(encoded);
    // update cache by hash
    this.#cachedRules.set(hash, rulePtr);
    this.#reshape_list.push([rulePtr, this.#addFunc((rule as any).reshape)]);
    this.#incrementUsage(rule);
    return rulePtr;
  }

  #addSeqChildParams(rulePtr: number, child: SeqChildRule) {
    const OPT_MASK = 0b00001;
    const SKIP_MASK = 0b00010;
    const KEY_MASK = 0b00100;
    const PUSH_MASK = 0b01000;
    const POP_MASK = 0b10000;
    const flags =
      (child.opt ? OPT_MASK : 0) +
      (child.skip ? SKIP_MASK : 0) +
      (child.push ? PUSH_MASK : 0) +
      (child.pop ? POP_MASK : 0) +
      (child.key ? KEY_MASK : 0);
    if (flags > 0) this.#flags_list.push([rulePtr, flags]);
    if (child.key) this.#key_list.push([rulePtr, this.#addString(child.key)]);
    if (child.pop) this.#pop_list.push([rulePtr, this.#addFunc(child.pop)]);
  }

  #addString(s: string | null | void) {
    if (s == null) return 0;
    if (this.#strings.includes(s)) return this.#strings.indexOf(s);
    const ptr = this.#strings.length;
    this.#strings.push(s);
    return ptr;
  }

  #addFunc(f: Function | undefined | null) {
    if (f == null) return 0;
    const ptr = this.#funcs.length;
    this.#funcs.push(f);
    return ptr;
  }

  #addChildren(
    kind:
      | typeof RULE_SEQ
      | typeof RULE_SEQ_OBJECT
      | typeof RULE_OR
      | typeof RULE_NOT,
    childrenIds: number[]
  ) {
    const cidsPtr = this.#cids[kind].length;
    this.#cids[kind].push(childrenIds);
    if (childrenIds.length > 255) throw new Error("too many children");
    return cidsPtr;
  }
}

let _cnt = 1;
let runId = () => _cnt++;

const docodeRule = (s: EncodedRule, index: number, kind: number): Rule => {
  // const kind = s[0];
  // return serialized;
  // const flags = (rule.opt ? 0b1 : 0) + (node.skip ? 0b10 : 0);
  // const [id1, id2] = twoBytes(rule.id);
  // for (let i = 0; i < s.length; i++) {
  // }

  // const reshapeId = reshapeMap.get(index)!;
  switch (kind) {
    // case RULE_TOKEN: {
    //   const [stringPtr] = s as SerializedToken;
    //   return {
    //     kind: RULE_TOKEN,
    //     id: runId(),
    //     expr: __strings[stringPtr],
    //     reshape: __funcs[reshapeId] ?? 0,
    //   } as Token;
    // }
    // case RULE_REGEX: {
    //   const [stringPtr] = s as SerializedRegex;
    //   return {
    //     kind: RULE_REGEX,
    //     id: runId(),
    //     expr: __strings[stringPtr],
    //     reshape: __funcs[reshapeId] ?? 0,
    //   } as Regex;
    // }
    // case RULE_SEQ: {
    //   return {
    //     kind: RULE_SEQ,
    //     id: runId(),
    //     children: [],
    //     reshape: __funcs[reshapeId] as any,
    //   } as Seq;
    // }

    // case RULE_SEQ_OBJECT: {
    //   const s = [
    //     rule.kind,
    //     id1,
    //     id2,
    //     ...twoBytes(
    //       addChildren(rule.children.map((x) => serialize(x as Rule)))
    //     ),
    //     addFunc(rule.reshape),
    //   ] as SerializedSeqObject;
    //   return addRule(s);
    // }
    // case RULE_ANY: {
    //   const s = [
    //     rule.kind,
    //     id1,
    //     id2,
    //     rule.len,
    //     addFunc(rule.reshape),
    //   ] as SerializedAny;
    //   return addRule(s);
    // }
    // case RULE_REPEAT: {
    //   const childPtr = serialize(rule.pattern as Rule);
    //   const cid1 = Math.floor(childPtr / SIZE);
    //   const cid2 = childPtr % SIZE;
    //   const s = [
    //     rule.kind,
    //     id1,
    //     id2,
    //     cid1,
    //     cid2,
    //     addFunc(rule.reshapeEach),
    //     addFunc(rule.reshape),
    //   ] as SerializedRepeat;
    //   return addRule(s);
    // }
    // case RULE_EOF: {
    //   const s = [rule.kind, id1, id2] as SerializedEof;
    //   return addRule(s);
    // }
    // case RULE_OR: {
    //   const children = rule.patterns.map((p) => serialize(p));
    //   const childrenPtr = addChildren(children);
    //   const s = [rule.kind, id1, id2, ...twoBytes(childrenPtr)] as SerializedOr;
    //   return addRule(s);
    // }
    // case RULE_ATOM: {
    //   const s = [rule.kind, id1, id2, addFunc(rule.parse)] as SerializedAtom;
    //   return addRule(s);
    // }
    // case RULE_REF: {
    //   const s = [
    //     rule.kind,
    //     id1,
    //     id2,
    //     rule.ref,
    //     addFunc(rule.reshape),
    //   ] as SerializedRef;
    //   return addRule(s);
    // }
    // case RULE_NOT: {
    //   const children = rule.patterns.map((p) => serialize(p));
    //   const childrenPtr = addChildren(children);
    //   const s = [
    //     rule.kind,
    //     id1,
    //     id2,
    //     ...twoBytes(childrenPtr),
    //   ] as SerializedNot;
    //   return addRule(s);
    // }
    default: {
      // @ts-expect-error
      // throw new Error(`Unsupported node kind: ${rule.kind}`);
      return s;
    }
  }
};

import zlib from "zlib";

const rawRules = $dump();

// const dumppedRaw = JSON.stringify(dumpped);
// console.log("dump", dumppedRaw + "bytes");
// console.log("dump:deflate", zlib.deflateSync(dumppedRaw).length / 1024 + "kb");

const sortedRules = Object.entries(rawRules).sort(([, a], [, b]) => a.t - b.t);

// console.log(
//   "sorted:",
//   sortedRules.map(([, r]) => [r.kind, r.id])
// );

const encoder = new Encoder();
for (const [refId, rule] of sortedRules) {
  encoder.registerRule(rule);
}

const buf = encoder.emitBuffer();

// @ts-ignore
// console.log("max id", Math.max(...encoded.flat(Infinity)));

// const buf = new Uint8Array(encoded.flat(2));
// console.log("raw:", buf.byteLength / 1024 + "kb");
const gzipped = zlib.deflateSync(buf);
console.log("deflate", gzipped.byteLength + "bytes");
// console.log("string", JSON.stringify([...stringMap]).length / 1024 + "kb");

// console.log("rule:", ruleCount, "\ttoken:", tokenCount);

// import fs from "fs";
// fs.writeFileSync("syntax.bin", gzipped);

// console.time("decode");
// const loaded = fs.readFileSync("syntax.bin");
// const decoded = zlib.inflateSync(loaded);

// console.log("decoded", decoded.byteLength / 1024 + "kb");
// const uint8d = new Uint8Array(decoded);
// const ds = [];
// for (let i = 0; i < uint8d.length / 8; i++) {
//   const s = uint8d.slice(i * 8, (i + 1) * 8);
//   ds.push(docodeRule(s as any as SerializedRule));
// }
// console.log(ds);
// console.timeEnd("decode");
// console.log(seqCount, seqoCount, orCount);
