import type {
  Rule,
  Compiler,
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

import { compileFragment } from "./runtime";

let cnt = 2;
const genId = () => cnt++;

export function createRef(refId: string | number, reshape?: Reshape): Ref {
  return {
    u: genId(),
    t: RULE_REF,
    c: refId,
    r: reshape,
  } as Ref;
}

const __tokenCache = new Map<string, Token>();
const toNode = (input: RuleExpr): Rule => {
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
const buildRules = () => __registered.map((creator) => toNode(creator()));

export const $close = (compiler: Compiler) => {
  console.time("mints:init");
  const rules = buildRules();
  const parsers = rules.map((rule, rootId) =>
    compileFragment(rule, compiler, rootId)
  );
  // console.log("before push", compiler.parsers.length);
  compiler.parsers.push(...parsers);
  __registered.length = 0;
  __tokenCache.clear();
  console.timeEnd("mints:init");
};

export const $dump = () => {
  return buildRules();
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

// seq child builder
// export function $param(key: string, node: RuleExpr): Flags {
//   return { ...toNode(node), key } as Flags;
// }

export function $skip(input: RuleExpr): [Flags, Rule] {
  return [{ skip: true }, toNode(input)];
  // return { ...toNode(input), skip: true } as SeqChildRule;
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

// const tokenCache: { [key: string]: Token } = {};
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

// const regexCache: { [key: string]: Regex<any> } = {};
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

// regex sharthand
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
