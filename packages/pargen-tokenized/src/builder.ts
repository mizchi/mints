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
  O_Rule,
  O_Token,
  O_Repeat,
} from "./types";

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
} from "./constants";

let cnt = 2;

const genId = () => cnt++;

const __tokenCache = new Map<string, Token>();
export const toNode = (input: RuleExpr): Rule => {
  if (typeof input === "object") {
    return input;
  }
  if (typeof input === "number") {
    return $ref(input);
  }
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

function compileToRuntimeRules(
  rawRules: Rule[]
): [
  rules: O_Rule[],
  refs: number[],
  strings: string[],
  funcs: Function[],
  reshapes: number[]
] {
  const o_rules: O_Rule[] = [];
  const strings: string[] = [];
  const reshapes: number[] = [];
  const funcs: Function[] = [];

  function addString(str: string) {
    const at = strings.indexOf(str);
    if (at > -1) return at;
    const ptr = strings.length;
    strings.push(str);
    return ptr;
  }
  function addFunc(fn: Function | void) {
    if (fn == null) return 0;
    const ptr = funcs.length;
    funcs.push(fn);
    return ptr;
  }

  function addRule(rule: Rule): number {
    switch (rule.t) {
      case RULE_TOKEN: {
        const strPtr = addString(rule.c as string);
        rule = { ...rule, c: strPtr } as O_Token as any;
        break;
      }
      case RULE_REPEAT: {
        rule = { ...rule, c: addRule(rule.c as Rule) } as O_Repeat;
        break;
      }
      case RULE_SEQ:
      case RULE_SEQ_OBJECT: {
        // handle seq child flags
      }
      case RULE_OR:
      case RULE_NOT: {
        rule = {
          ...rule,
          c: (rule.c as Rule[]).map(addRule),
        } as O_Rule as any;
      }
    }
    const ptr = o_rules.length;
    // @ts-ignore
    const r = rule.r as any;
    if (r) {
      const fnPtr = addFunc(r);
      reshapes[ptr] = fnPtr;
      // rule = { ...rule, r: fnPtr } as O_Rule as any;
    }
    o_rules.push(rule as O_Rule);
    return ptr;
  }

  const refs = rawRules.map(addRule);
  return [o_rules, refs, strings, funcs, reshapes];
}

export const $close = () => {
  const defs = buildDefs();
  const compiled = compileToRuntimeRules(defs);
  // __registered.length = 0;
  // __tokenCache.clear();
  // console.log("========== close", defs.length, compiled.length);
  return compiled;
};

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
    u: genId(),
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
    u: genId(),
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
    u: genId(),
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
    u: genId(),
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

  // return $opt($seq(input)) as Seq;
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

export function $not(children: RuleExpr[], reshape?: Reshape): Not {
  const childNodes = children.map(toNode);
  return {
    t: RULE_NOT,
    c: childNodes,
    reshape,
    u: genId(),
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
    u: genId(),
  } as Or;
}

export function $repeat<T = any, U = T, R = T[]>(
  pattern: RuleExpr,
  reshapeEach?: (results: T[], ctx: ParseContext) => U,
  reshape?: (results: U[], ctx: ParseContext) => R
): Repeat<T, U, R> {
  return {
    u: genId(),
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
    u: genId(),
    t: RULE_TOKEN,
    c: expr,
    r: reshape,
  };
}

export function $regex<T = string>(
  expr: string | RegExp,
  reshape?: (raw: string) => T
): Regex<T> {
  return {
    u: genId(),
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
    u: genId(),
    t: RULE_EOF,
  };
}

export function $atom(parse: InternalParser): Atom {
  return {
    u: genId(),
    t: RULE_ATOM,
    c: parse,
  };
}
