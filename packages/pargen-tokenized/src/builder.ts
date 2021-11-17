import type {
  Rule,
  RuleExpr,
  Token,
  Reshape,
  Seq,
  Ref,
  Not,
  Or,
  Eof,
  Repeat,
  Atom,
  Regex,
  InternalParser,
  ParseContext,
  Flags,
  SeqObject,
  Any,
  Snapshot,
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

export function compileSnapshot(): Snapshot {
  const state = {
    rules: [],
    values: [],
    refs: [],
    strings: [""],
    funcs: [() => {}],
    reshapes: {},
    reshapeEachs: {},
    flagsList: {},
    keyList: {},
    popList: {},
    cidsList: [],
  } as Snapshot;

  function addCids(ptrs: number[]) {
    const ptr = state.cidsList.length;
    state.cidsList.push(ptrs);
    return ptr;
  }

  function addString(str: string) {
    const at = state.strings.indexOf(str);
    if (at > -1) return at;
    const ptr = state.strings.length;
    state.strings.push(str);
    return ptr;
  }
  function addFunc(fn: Function | void) {
    if (fn == null) return 0;
    const ptr = state.funcs.length;
    state.funcs.push(fn);
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

  function addRule(ruleRaw: Rule): number {
    let rule = { ...ruleRaw };
    let value: number = 0;

    switch (rule.t) {
      case RULE_REF: {
        value = rule.c;
        break;
      }
      case RULE_ATOM: {
        value = addFunc(rule.c);
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

    const rulePtr = state.rules.length;
    // @ts-ignore
    const r = rule.r as any;
    if (r) {
      const fnPtr = addFunc(r);
      state.reshapes[rulePtr] = fnPtr;
    }
    // post process with index
    if (
      ruleRaw.t === RULE_SEQ ||
      (ruleRaw.t === RULE_SEQ_OBJECT && ruleRaw.f.some((f) => f != null))
    ) {
      let fs: number[] = [];
      let ks: number[] = [];
      let ps: number[] = [];

      for (const flags of ruleRaw.f) {
        fs.push(flags ? toBitFlags(flags) : 0);
        ks.push(flags?.key ? addString(flags.key) : 0);
        ps.push(flags?.pop ? addFunc(flags.pop) : 0);
      }

      if (fs.some((k) => k > 0)) {
        state.flagsList[rulePtr] = fs;
      }
      if (ks.some((k) => k > 0)) {
        state.keyList[rulePtr] = ks;
      }
      if (ps.some((p) => p > 0)) {
        state.popList[rulePtr] = ps;
      }
    }
    if (rule.t === RULE_REPEAT && rule.e) {
      const fnPtr = addFunc(rule.e);
      state.reshapeEachs[rulePtr] = fnPtr;
    }

    state.rules.push(rule.t);
    state.values.push(value);
    return rulePtr;
  }
  const rawRules = buildDefs();
  state.refs = rawRules.map(addRule);
  return state;
}

export const $dump = () => {
  return buildDefs();
};

export function $def(nodeCreator: () => RuleExpr): number {
  const rootId = __registered.length;
  __registered.push(nodeCreator);
  return rootId;
}

export function $ref(refId: string | number, reshape?: Reshape): Ref {
  return {
    t: RULE_REF,
    c: refId,
    r: reshape,
  } as Ref;
}

export function $any<T = string>(
  len: number = 1,
  reshape?: (token: string) => T
): Any {
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
  pop?: (a: any[], b: any[], ctx: ParseContext) => boolean
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
          flagsExpr.pop
        );
      }
    }
    return null;
  });
};

export function $seq<T = string, U = string>(
  children: Array<RuleWithFlags>,
  reshape?: (results: T[], ctx: ParseContext) => U
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
  reshape?: (obj: T, ctx: ParseContext) => U
): SeqObject<T, U> {
  return {
    t: RULE_SEQ_OBJECT,
    c: children.map((child) =>
      toNode(child instanceof Array ? child[1] : child)
    ),
    f: toFlagsList(children),
    r: reshape,
  } as SeqObject<T, U>;
}

export function $repeat_seq(
  input: Array<RuleWithFlags>,
  reshapeEach?: Reshape,
  reshape?: Reshape
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

export function $or(patterns: Array<RuleExpr>, reshape?: Reshape): Or | Rule {
  if (patterns.length === 1) {
    return toNode(patterns[0]);
  }

  const builtPatterns = patterns.map(toNode) as Array<Seq | Token | Ref>;
  // const heads = builtPatterns.map(buildHeadTable).flat();

  return {
    t: RULE_OR,
    // heads: [],
    c: builtPatterns,
    reshape,
  } as Or;
}

export function $repeat<T = any, U = T, R = T[]>(
  pattern: RuleExpr,
  reshapeEach?: (results: T[], ctx: ParseContext) => U,
  reshape?: (results: U[], ctx: ParseContext) => R
): Repeat<T, U, R> {
  return {
    t: RULE_REPEAT,
    c: toNode(pattern),
    e: reshapeEach,
    r: reshape,
  };
}

export function $token<T = string>(
  expr: string,
  reshape?: (raw: string) => T
): Token<T> {
  return {
    t: RULE_TOKEN,
    c: expr,
    r: reshape,
  };
}

export function $regex<T = string>(
  expr: string,
  reshape?: (raw: string) => T
): Regex<T> {
  return {
    t: RULE_REGEX,
    c: expr,
    r: reshape,
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

export function $atom(parse: InternalParser): Atom {
  return {
    t: RULE_ATOM,
    c: parse,
  };
}
