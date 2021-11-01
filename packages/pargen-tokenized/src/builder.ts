import { compileFragment } from "./runtime";
import {
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
  REF,
  SEQ,
  NOT,
  OR,
  REPEAT,
  TOKEN,
  REGEX,
  ATOM,
  EOF,
  PairOpen,
  PAIR_OPEN,
  PairClose,
  PAIR_CLOSE,
  ParseContext,
  SeqChildRule,
  SeqChildParams,
  SEQ_OBJECT,
  SeqObject,
} from "./types";

let cnt = 2;
const genId = () => cnt++;

export function createRef(refId: string | number, reshape?: Reshape): Ref {
  return {
    id: genId(),
    kind: REF,
    ref: refId,
    reshape,
  } as Ref;
}

const toNode = (input: InputNodeExpr): Rule => {
  if (typeof input === "object") {
    return input;
  }
  if (typeof input === "number") {
    return $ref(input);
  }
  return typeof input === "string" ? $token(input) : input;
};

const __registeredPatterns: Array<[number, () => InputNodeExpr]> = [];
export const $close = (compiler: Compiler) => {
  const nodes: Rule[] = [];
  __registeredPatterns.forEach(([rootId, nodeCreator]) => {
    const node = nodeCreator();
    const resolvedNode = toNode(node);
    const parser = compileFragment(resolvedNode, compiler, rootId);
    compiler.parsers.set(rootId, parser);
    // TODO: Remove on prod
    // compiler.definitions.set(rootId, resolvedNode);
    nodes.push(resolvedNode);
  });
  __registeredPatterns.length = 0;
  nodes.length = 0;
};

let _defCounter = 2;
export function $def(nodeCreator: () => InputNodeExpr): number {
  const id = _defCounter++;
  __registeredPatterns.push([id as any, nodeCreator]);
  return id;
}

export function $ref(refId: string | number, reshape?: Reshape): Ref {
  return {
    id: genId(),
    kind: REF,
    ref: refId,
    reshape,
  } as Ref;
}

const toSeqChild = (
  rule: Rule,
  opt?: boolean,
  skip?: boolean,
  key?: string
): SeqChildRule => {
  return { key, skip, opt, ...rule };
};

type SeqChildInputNodeExpr = InputNodeExpr | SeqChildRule;

export function $seq<T = string, U = string>(
  children: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >,
  reshape?: (results: T[], ctx: ParseContext) => U
): Seq {
  const compiledChildren = children.map((child): SeqChildRule => {
    if (Array.isArray(child)) {
      const [params, child_] = child;
      if (typeof params === "string") {
        return toSeqChild(toNode(child_), false, false, params);
      } else {
        return toSeqChild(toNode(child_), params.opt, params.skip, params.key);
      }
    } else {
      return toSeqChild(toNode(child as InputNodeExpr));
    }
  });
  return {
    id: genId(),
    kind: SEQ,
    children: compiledChildren,
    reshape,
  } as Seq;
}

export function $seqo<T = string, U = any>(
  children: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >,
  reshape?: (results: T[], ctx: ParseContext) => U
): SeqObject<T, U> {
  const compiledChildren = children.map((child): SeqChildRule => {
    if (Array.isArray(child)) {
      const [params, child_] = child;
      if (typeof params === "string") {
        return toSeqChild(toNode(child_), false, false, params);
      } else {
        return toSeqChild(toNode(child_), params.opt, params.skip, params.key);
      }
    } else {
      return toSeqChild(toNode(child as InputNodeExpr));
    }
  });
  return {
    id: genId(),
    kind: SEQ_OBJECT,
    children: compiledChildren,
    reshape,
  } as SeqObject<T, U>;
}

export function $repeat_seq(
  input: Array<
    SeqChildInputNodeExpr | [params: string | SeqChildParams, ex: InputNodeExpr]
  >,
  minmax?: [number, number],
  reshape?: Reshape
): Repeat {
  return $repeat($seq(input), minmax, reshape);
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
    kind: NOT,
    patterns: childNodes,
    reshape,
    id: genId(),
  } as Not;
}

function findFirstNonOptionalRule(seq: Seq): Rule | undefined {
  if (seq.kind === SEQ) {
    for (const child of seq.children) {
      if (child.opt) continue;
      if (child.kind === SEQ) {
        return findFirstNonOptionalRule(child as unknown as Seq);
      } else {
        return child as unknown as Seq;
      }
    }
  }
  return undefined;
}

function buildHeadTable(rule: Rule): Rule[] {
  switch (rule.kind) {
    case PAIR_CLOSE:
      throw new Error();
    case PAIR_OPEN: {
      return [rule.pattern];
    }
    case ATOM:
    case REGEX:
    case NOT:
    case REF:
    case EOF:
    case TOKEN:
      return [rule];
    case REPEAT: {
      return buildHeadTable(rule.pattern);
    }
    case SEQ: {
      const head = findFirstNonOptionalRule(rule);
      return head ? buildHeadTable(head) : [];
    }
    case SEQ_OBJECT: {
      throw new Error();
    }
    case OR: {
      return rule.patterns.map((pat) => buildHeadTable(pat)).flat();
    }
  }
}

export function $or(
  patterns: Array<InputNodeExpr>,
  reshape?: Reshape
): Or | Rule {
  if (patterns.length === 1) {
    return toNode(patterns[0]);
  }

  const builtPatterns = patterns.map(toNode) as Array<Seq | Token | Ref>;
  const heads = builtPatterns.map(buildHeadTable).flat();

  return {
    kind: OR,
    heads,
    patterns: builtPatterns,
    reshape,
    id: genId(),
  } as Or;
}

export function $repeat(
  pattern: InputNodeExpr,
  minmax?: [min: number | void, max?: number | void],
  reshapeEach?: Reshape<any, any>,
  reshape?: Reshape<any, any>
): Repeat {
  const [min = 0, max = undefined] = minmax ?? [];
  return {
    id: genId(),
    kind: REPEAT,
    pattern: toNode(pattern),
    min,
    max,
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
    kind: TOKEN,
    expr,
    reshape,
  };
}

// const regexCache: { [key: string]: Regex<any> } = {};
export function $regex<T = string>(
  expr: string,
  reshape?: (raw: string) => T
): Regex<T> {
  // if (regexCache[expr]) return regexCache[expr];
  // return (regexCache[expr] = {
  //   ...nodeBaseDefault,
  //   id: genId(),
  //   kind: REGEX,
  //   expr,
  //   reshape,
  // });
  return {
    id: genId(),
    kind: REGEX,
    expr,
    reshape,
  };
}

// pairOpen
export function $pairOpen(rule: InputNodeExpr): PairOpen {
  return {
    id: genId(),
    kind: PAIR_OPEN,
    pattern: toNode(rule),
  };
}

// pairClose
export function $pairClose(rule: InputNodeExpr): PairClose {
  return {
    id: genId(),
    kind: PAIR_CLOSE,
    pattern: toNode(rule),
  };
}

// regex sharthand
export function $r(strings: TemplateStringsArray, name?: string): Regex {
  return $regex(strings.join(""));
}

export function $eof(): Eof {
  return {
    id: genId(),
    kind: EOF,
  };
}

export function $atom(parser: InternalParser): Atom {
  return {
    id: genId(),
    kind: ATOM,
    parse: parser,
  };
}

// export function $reshape<T extends Rule>(
//   node: InputNodeExpr,
//   reshape: Reshape
// ): T {
//   return { ...toNode(node), reshape } as T;
// }

// export function $repeat_seq1(input: InputNodeExpr[]) {
//   return $repeat($seq(input), [1]);
// }
