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
} from "./constants";
// import { ohash } from "object-hash";
import type {
  Rule,
  RuleExpr,
  Token,
  Seq,
  Ref,
  Not,
  Or,
  Eof,
  Repeat,
  Atom,
  Regex,
  Flags,
  SeqObject,
  Any,
  Snapshot,
  ReshapePtr,
} from "./types";

import {
  KEY_MASK,
  OPT_MASK,
  POP_MASK,
  PUSH_MASK,
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
  SKIP_MASK,
} from "./constants";

// import type { Opaque } from "ts-opaque";

export type Ptr<T> = number & {
  t: T;
};

export const _strings: string[] = [];
export const $str = (s: string): Ptr<string> => {
  const idx = _strings.indexOf(s);
  if (idx > -1) return idx as Ptr<string>;
  const ptr = _strings.length;
  _strings.push(s);
  return ptr as Ptr<string>;
};

const __tokenCache = new Map<string, Token>();
export const toNode = (input: RuleExpr): Rule => {
  if (typeof input === "object") return input;
  if (typeof input === "number") return $ref(input);
  if (typeof input === "string") {
    if (__tokenCache.has(input)) {
      return __tokenCache.get(input)!;
    } else {
      const newToken = $token(input);
      __tokenCache.set(input, newToken);
      return newToken;
    }
  }
  return input;
};

const __registered: Array<() => RuleExpr> = [];
const buildDefs = () => __registered.map((creator) => toNode(creator()));

// @ts-ignore
// import objectHash from "./ohash.js";

export function createSnapshot(refId: number): Snapshot {
  const entryRefId = $def(() => $seq([toNode(refId), $eof()]));
  const snapshot = compileSnapshot();
  snapshot[E_entryRefId] = entryRefId;
  return snapshot;
}

export function compileSnapshot(): Snapshot {
  const cachedRules = new Map<string, number>();

  const state = [0, [], [], [], [], {}, {}, {}, {}, [], [""]] as Snapshot;

  function addCids(ptrs: number[]) {
    const ptr = state[E_cidsList].length;
    state[E_cidsList].push(ptrs);
    return ptr;
  }

  function addString(str: string) {
    const at = state[E_strings].indexOf(str);
    if (at > -1) return at;
    const ptr = state[E_strings].length;
    state[E_strings].push(str);
    return ptr;
  }

  function toBitFlags(flags: Flags): number {
    return (
      (flags.opt ? OPT_MASK : 0) +
      (flags.skip ? SKIP_MASK : 0) +
      (flags.push ? PUSH_MASK : 0) +
      (flags.pop ? POP_MASK : 0) +
      (flags.key ? KEY_MASK : 0)
    );
  }

  function addRule(rule: Rule): number {
    // const hash = requi
    // const hash = objectHash(rule);
    const hash = JSON.stringify(rule);
    if (cachedRules.has(hash)) {
      return cachedRules.get(hash)!;
    }
    // let rule = { ...ruleRaw };
    let value: number = 0;

    switch (rule.t) {
      case RULE_REF: {
        value = rule.c;
        break;
      }
      case RULE_ATOM: {
        value = rule.c;
        break;
      }
      case RULE_ANY: {
        value = rule.c;
        break;
      }
      case RULE_REGEX:
      case RULE_TOKEN: {
        const strPtr = addString(rule.c as string);
        value = strPtr;
        break;
      }
      case RULE_REPEAT: {
        value = addRule(rule.c as Rule);
        break;
      }
      case RULE_SEQ:
      case RULE_SEQ_OBJECT:
      case RULE_OR:
      case RULE_NOT: {
        const cids = (rule.c as Rule[]).map(addRule);
        const cidsPtr = addCids(cids);
        value = cidsPtr;
        break;
      }
    }

    const rulePtr = state[E_rules].length;
    // @ts-ignore
    const r = rule.r as any;
    if (r) {
      state[E_reshapes][rulePtr] = r;
    }
    if (
      rule.t === RULE_SEQ ||
      (rule.t === RULE_SEQ_OBJECT && rule.f.some((f) => f != null))
    ) {
      let fs: number[] = [];
      let ks: number[] = [];
      let ps: number[] = [];

      for (const flags of rule.f) {
        fs.push(flags ? toBitFlags(flags) : 0);
        ks.push(flags?.key ? addString(flags.key) : 0);
        ps.push(flags?.pop ?? 0);
      }

      if (fs.some((k) => k > 0)) {
        state[E_flagsList][rulePtr] = fs;
      }
      if (ks.some((k) => k > 0)) {
        state[E_keyList][rulePtr] = ks;
      }
      if (ps.some((p) => p > 0)) {
        state[E_popList][rulePtr] = ps;
      }
    }
    if (rule.t === RULE_REPEAT && rule.e) {
      const fnPtr = rule.e;
      state[E_reshapeEachs][rulePtr] = fnPtr;
    }

    state[E_rules].push(rule.t);
    state[E_values].push(value);
    cachedRules.set(hash, rulePtr);
    return rulePtr;
  }
  const rawRules = buildDefs();
  state[E_refs] = rawRules.map(addRule);
  return state;
}

export function $def(nodeCreator: () => RuleExpr): number {
  const rootId = __registered.length;
  __registered.push(nodeCreator);
  return rootId;
}

export function $ref(refId: string | number, reshape: number = 0): Ref {
  return {
    t: RULE_REF,
    c: refId,
    r: reshape,
  } as Ref;
}

export function $any<T = string>(len: number = 1, reshape: number = 0): Any {
  return {
    t: RULE_ANY,
    c: len,
    r: reshape,
  } as Any;
}

const toFlags = (
  key?: string,
  opt?: boolean,
  skip?: boolean,
  push?: boolean,
  pop?: number,
): Flags => {
  return { key, skip, opt, push, pop };
};

type FlagsExpr = string | Flags;
type RuleWithFlags = RuleExpr | [flags: FlagsExpr, rule: RuleExpr];

const toFlagsList = (children: Array<RuleWithFlags>): (Flags | null)[] => {
  return children.map((child) => {
    if (Array.isArray(child)) {
      const [flagsExpr] = child;
      if (typeof flagsExpr === "string") {
        return toFlags(flagsExpr);
      } else {
        return toFlags(
          flagsExpr.key,
          flagsExpr.opt,
          flagsExpr.skip,
          flagsExpr.push,
          flagsExpr.pop,
        );
      }
    }
    return null;
  });
};

export function $seq<T = string, U = string>(
  children: Array<RuleWithFlags>,
  reshape: number = 0,
): Seq {
  return {
    t: RULE_SEQ,
    c: children.map((child) => {
      if (child instanceof Array) {
        return toNode(child[1]);
      }
      return toNode(child);
    }),
    f: toFlagsList(children),
    r: reshape,
  } as Seq;
}

export function $seqo<T = any, U = any>(
  children: Array<RuleWithFlags>,
  reshape: number = 0,
): SeqObject<T, U> {
  return {
    t: RULE_SEQ_OBJECT,
    c: children.map((child) =>
      toNode(child instanceof Array ? child[1] : child),
    ),
    f: toFlagsList(children),
    r: reshape,
  } as SeqObject<T, U>;
}

export function $repeat_seq(
  input: Array<RuleWithFlags>,
  reshapeEach = 0,
  reshape = 0,
): Repeat {
  return $repeat($seq(input), reshapeEach, reshape);
}

export function $opt_seq(input: Array<RuleWithFlags>): [Flags, Rule] {
  return [{ opt: true }, $seq(input)];
}

export function $skip(input: RuleExpr): [Flags, Rule] {
  return [{ skip: true }, toNode(input)];
}

export function $skip_opt(input: RuleExpr): [Flags, Rule] {
  return [{ skip: true, opt: true }, toNode(input)];
}

export function $opt(input: RuleExpr): [Flags, Rule] {
  return [{ opt: true }, toNode(input)];
}

export function $not(children: RuleExpr[]): Not {
  const childNodes = children.map(toNode);
  return {
    t: RULE_NOT,
    c: childNodes,
  } as Not;
}

// TODO: Impl head tables
// function findFirstNonOptionalRule(seq: Seq): Rule | undefined {
//   if (seq.kind === SEQ) {
//     for (const child of seq.children) {
//       if (child.opt) continue;
//       if (child.kind === SEQ) {
//         return findFirstNonOptionalRule(child as unknown as Seq);
//       } else {
//         return child as unknown as Seq;
//       }
//     }
//   }
//   return undefined;
// }

// function buildHeadTable(rule: Rule): Rule[] {
//   switch (rule.kind) {
//     case PAIR_CLOSE:
//       throw new Error();
//     case PAIR_OPEN: {
//       return [rule.pattern];
//     }
//     case ATOM:
//     case REGEX:
//     case NOT:
//     case REF:
//     case EOF:
//     case TOKEN:
//       return [rule];
//     case REPEAT: {
//       return buildHeadTable(rule.pattern);
//     }
//     case SEQ: {
//       const head = findFirstNonOptionalRule(rule);
//       return head ? buildHeadTable(head) : [];
//     }
//     case SEQ_OBJECT: {
//       throw new Error();
//     }
//     case OR: {
//       return rule.patterns.map((pat) => buildHeadTable(pat)).flat();
//     }
//   }
// }

export function $or(patterns: Array<RuleExpr>): Or | Rule {
  if (patterns.length === 1) {
    return toNode(patterns[0]);
  }

  const builtPatterns = patterns.map(toNode) as Array<Seq | Token | Ref>;
  // const heads = builtPatterns.map(buildHeadTable).flat();

  return {
    t: RULE_OR,
    // heads: [],
    c: builtPatterns,
  } as Or;
}

export function $repeat<T = any, U = T, R = T[]>(
  pattern: RuleExpr,
  reshapeEach: number = 0,
  reshape: number = 0,
): Repeat<T, U, R> {
  return {
    t: RULE_REPEAT,
    c: toNode(pattern),
    e: reshapeEach,
    r: reshape as ReshapePtr,
  };
}

export function $token<T = string>(
  expr: string,
  reshape: number = 0,
): Token<T> {
  return {
    t: RULE_TOKEN,
    c: expr,
    r: reshape as ReshapePtr,
  };
}

export function $regex<T = string>(expr: string, reshape: number = 0): Regex {
  return {
    t: RULE_REGEX,
    c: expr,
    r: reshape as ReshapePtr,
  };
}

export function $r(strings: TemplateStringsArray): Regex {
  return $regex(strings.join(""));
}

export function $eof(): Eof {
  return {
    t: RULE_EOF,
  };
}

export function $atom(parsePtr: number): Atom {
  return {
    t: RULE_ATOM,
    c: parsePtr as Ptr<any>,
  };
}
