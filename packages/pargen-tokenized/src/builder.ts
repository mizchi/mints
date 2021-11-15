import type {
  Rule,
  Compiler,
  InputNodeExpr,
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
  SeqChildRule,
  SeqChildParams,
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
    id: genId(),
    kind: RULE_REF,
    ref: refId,
    reshape,
  } as Ref;
}

const __tokenCache = new Map<string, Token>();
const toNode = (input: InputNodeExpr): Rule => {
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

const __registered: Array<() => InputNodeExpr> = [];
const buildRules = () => __registered.map((creator) => toNode(creator()));

export const $close = (compiler: Compiler) => {
  console.time("mints:init");
  const rules = buildRules();
  const parsers = rules.map((rule, rootId) =>
    compileFragment(rule, compiler, rootId)
  );
  compiler.parsers.push(...parsers);
  __registered.length = 0;
  console.timeEnd("mints:init");
};

export const $dump = () => {
  return buildRules();
};

export function $def(nodeCreator: () => InputNodeExpr): number {
  const rootId = __registered.length;
  __registered.push(nodeCreator);
  return rootId;
}

export function $ref(refId: string | number, reshape?: Reshape): Ref {
  return {
    id: genId(),
    kind: RULE_REF,
    ref: refId,
    reshape,
  } as Ref;
}

export function $any<T = string>(
  len: number = 1,
  reshape?: (token: string) => T
): Any {
  return {
    id: genId(),
    kind: RULE_ANY,
    len,
    reshape,
  } as Any;
}

const toSeqChild = (
  rule: Rule,
  key?: string,
  opt?: boolean,
  skip?: boolean,
  push?: boolean,
  pop?: (a: any[], b: any[], ctx: ParseContext) => boolean
): SeqChildRule => {
  return { key, skip, opt, push, pop, ...rule };
};

type SeqChildInputNodeExpr = InputNodeExpr | SeqChildRule;

const toSeqChildren = (
  children: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >
): SeqChildRule[] => {
  return children.map((child): SeqChildRule => {
    if (Array.isArray(child)) {
      const [params, child_] = child;
      if (typeof params === "string") {
        return toSeqChild(toNode(child_), params);
      } else {
        return toSeqChild(
          toNode(child_),
          params.key,
          params.opt,
          params.skip,
          params.push,
          params.pop
        );
      }
    } else {
      return toSeqChild(toNode(child as InputNodeExpr));
    }
  });
};

export function $seq<T = string, U = string>(
  children: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >,
  reshape?: (results: T[], ctx: ParseContext) => U
): Seq {
  return {
    id: genId(),
    kind: RULE_SEQ,
    children: toSeqChildren(children),
    reshape,
  } as Seq;
}

export function $seqo<T = any, U = any>(
  children: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >,
  reshape?: (obj: T, ctx: ParseContext) => U
): SeqObject<T, U> {
  return {
    id: genId(),
    kind: RULE_SEQ_OBJECT,
    children: toSeqChildren(children),
    reshape,
  } as SeqObject<T, U>;
}

export function $repeat_seq(
  input: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >,
  reshapeEach?: Reshape,
  reshape?: Reshape
): Repeat {
  return $repeat($seq(input), reshapeEach, reshape);
}

export function $opt_seq(
  input: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >
): Seq {
  return $opt($seq(input)) as Seq;
}

// seq child builder
export function $param(key: string, node: InputNodeExpr): SeqChildParams {
  return { ...toNode(node), key } as SeqChildParams;
}

export function $skip(input: InputNodeExpr): SeqChildRule {
  return { ...toNode(input), skip: true } as SeqChildRule;
}

export function $skip_opt(input: InputNodeExpr): SeqChildRule {
  return { ...toNode(input), skip: true, opt: true } as SeqChildRule;
}

export function $opt(input: InputNodeExpr): SeqChildRule {
  return { ...toNode(input), opt: true } as SeqChildRule;
}

export function $not(children: InputNodeExpr[], reshape?: Reshape): Not {
  const childNodes = children.map(toNode);
  return {
    kind: RULE_NOT,
    patterns: childNodes,
    reshape,
    id: genId(),
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

export function $or(
  patterns: Array<InputNodeExpr>,
  reshape?: Reshape
): Or | Rule {
  if (patterns.length === 1) {
    return toNode(patterns[0]);
  }

  const builtPatterns = patterns.map(toNode) as Array<Seq | Token | Ref>;
  // const heads = builtPatterns.map(buildHeadTable).flat();

  return {
    kind: RULE_OR,
    // heads: [],
    patterns: builtPatterns,
    reshape,
    id: genId(),
  } as Or;
}

export function $repeat<T = any, U = T, R = T[]>(
  pattern: InputNodeExpr,
  reshapeEach?: (results: T[], ctx: ParseContext) => U,
  reshape?: (results: U[], ctx: ParseContext) => R
): Repeat<T, U, R> {
  return {
    id: genId(),
    kind: RULE_REPEAT,
    pattern: toNode(pattern),
    reshapeEach,
    reshape,
  };
}

// const tokenCache: { [key: string]: Token } = {};
export function $token<T = string>(
  expr: string,
  reshape?: (raw: string) => T
): Token<T> {
  return {
    id: genId(),
    kind: RULE_TOKEN,
    expr,
    reshape,
  };
}

// const regexCache: { [key: string]: Regex<any> } = {};
export function $regex<T = string>(
  expr: string | RegExp,
  reshape?: (raw: string) => T
): Regex<T> {
  return {
    id: genId(),
    kind: RULE_REGEX,
    expr,
    reshape,
  };
}

// regex sharthand
export function $r(strings: TemplateStringsArray): Regex {
  return $regex(strings.join(""));
}

export function $eof(): Eof {
  return {
    id: genId(),
    kind: RULE_EOF,
  };
}

export function $atom(parse: InternalParser): Atom {
  return {
    id: genId(),
    kind: RULE_ATOM,
    parse: parse,
  };
}
