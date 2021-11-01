import { compileFragment } from "./runtime";
import {
  Rule,
  Compiler,
  InputNodeExpr,
  Token,
  nodeBaseDefault,
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
} from "./types";

let cnt = 2;
const genId = () => cnt++;

export function createRef(refId: string | number, reshape?: Reshape): Ref {
  return {
    ...nodeBaseDefault,
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
    ...nodeBaseDefault,
    id: genId(),
    kind: REF,
    ref: refId,
    reshape,
  } as Ref;
}

export function $seq<T = string, U = string>(
  children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
  reshape?: (results: T[], ctx: ParseContext) => U
): Seq {
  const compiledChildren = children.map((child): Rule => {
    if (Array.isArray(child)) {
      const [key, ex] = child;
      return $param(key, toNode(ex));
    } else {
      return toNode(child);
    }
  });
  return {
    ...nodeBaseDefault,
    id: genId(),
    kind: SEQ,
    children: compiledChildren,
    reshape,
  } as Seq;
}

export function $not(children: InputNodeExpr[], reshape?: Reshape): Not {
  const childNodes = children.map(toNode);
  return {
    ...nodeBaseDefault,
    kind: NOT,
    patterns: childNodes,
    reshape,
    id: genId(),
  } as Not;
}

function findFirstNonOptionalRule(seq: Seq): Rule | undefined {
  if (seq.kind === SEQ) {
    for (const child of seq.children) {
      if (child.optional) continue;
      if (child.kind === SEQ) {
        return findFirstNonOptionalRule(child);
      } else {
        return child;
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
    ...nodeBaseDefault,
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
    ...nodeBaseDefault,
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
    ...nodeBaseDefault,
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
    ...nodeBaseDefault,
    id: genId(),
    kind: REGEX,
    expr,
    reshape,
  };
}

// pairOpen
export function $pairOpen(rule: InputNodeExpr): PairOpen {
  return {
    ...nodeBaseDefault,
    id: genId(),
    kind: PAIR_OPEN,
    pattern: toNode(rule),
  };
}

// pairClose
export function $pairClose(rule: InputNodeExpr): PairClose {
  return {
    ...nodeBaseDefault,
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
    ...nodeBaseDefault,
    id: genId(),
    kind: EOF,
  };
}

export function $atom(parser: InternalParser): Atom {
  return {
    ...nodeBaseDefault,
    id: genId(),
    kind: ATOM,
    parse: parser,
  };
}

export function $param<T extends Rule>(key: string, node: InputNodeExpr): T {
  return { ...toNode(node), key } as T;
}

export function $reshape<T extends Rule>(
  node: InputNodeExpr,
  reshape: Reshape
): T {
  return { ...toNode(node), reshape } as T;
}

export function $skip<T extends Rule>(input: InputNodeExpr): T {
  return { ...toNode(input), skip: true } as T;
}
export function $skip_opt<T extends Rule>(input: InputNodeExpr): T {
  return { ...toNode(input), skip: true, optional: true } as T;
}

export function $repeat_seq(
  input: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
  minmax?: [number, number],
  reshape?: Reshape
): Repeat {
  return $repeat($seq(input), minmax, reshape);
}
export function $opt<T extends Rule>(input: InputNodeExpr): T {
  return { ...toNode(input), optional: true } as T;
}
export function $repeat_seq1(input: InputNodeExpr[]) {
  return $repeat($seq(input), [1]);
}
// };
