import { compileFragment } from "./compiler";
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

const registeredPatterns: Array<[number, () => InputNodeExpr]> = [];

export const $close = (compiler: Compiler) => {
  const nodes: Rule[] = [];
  registeredPatterns.forEach(([rootId, nodeCreator]) => {
    const node = nodeCreator();
    const resolvedNode = toNode(node);
    const parser = compileFragment(resolvedNode, compiler, rootId);
    compiler.parsers.set(rootId, parser);
    // TODO: Remove on prod
    compiler.definitions.set(rootId, resolvedNode);
    nodes.push(resolvedNode);
  });
  registeredPatterns.length = 0;
  nodes.length = 0;
};

let _defCounter = 2;
export function $def(nodeCreator: () => InputNodeExpr): number {
  const id = _defCounter++;
  registeredPatterns.push([id as any, nodeCreator]);
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

export function $seq(
  children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
  reshape?: Reshape
): Seq {
  let nodes: Rule[] = [];
  // if (compiler.composeTokens) {
  //   // compose token
  //   let currentTokens: string[] = [];
  //   children.forEach((child) => {
  //     if (typeof child === "string") {
  //       currentTokens.push(child);
  //     } else if (
  //       // plane expr
  //       typeof child !== "number" &&
  //       !Array.isArray(child) &&
  //       !child.skip &&
  //       child.kind === TOKEN &&
  //       child.reshape === defaultReshape &&
  //       child.key == null
  //     ) {
  //       currentTokens.push((child as Token).expr);
  //     } else {
  //       // compose queued expr list to one expr
  //       if (currentTokens.length > 0) {
  //         nodes.push(token(currentTokens.join("")));
  //         currentTokens = [];
  //       }

  //       if (Array.isArray(child)) {
  //         const [key, ex] = child;
  //         nodes.push(param(key, toNode(ex)));
  //       } else {
  //         // raw expr
  //         nodes.push(toNode(child));
  //       }
  //     }
  //   });
  //   nodes.push(token(currentTokens.join("")));
  // } else {
  // do not compose for debug
  nodes = children.map((child): Rule => {
    if (Array.isArray(child)) {
      const [key, ex] = child;
      return $param(key, toNode(ex));
    } else {
      return toNode(child);
    }
  });
  // }
  return {
    ...nodeBaseDefault,
    reshape,
    id: genId(),
    kind: SEQ,
    children: nodes,
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
    reshape,
  };
}

// const tokenCache: { [key: string]: Token } = {};
export function $token(expr: string, reshape?: Reshape<any, any>): Token {
  return {
    ...nodeBaseDefault,
    id: genId(),
    kind: TOKEN,
    expr,
    reshape,
  };
}

const regexCache: { [key: string]: Regex } = {};
export function $regex(expr: string, reshape?: Reshape<any, any>): Regex {
  if (regexCache[expr]) return regexCache[expr];
  return (regexCache[expr] = {
    ...nodeBaseDefault,
    id: genId(),
    kind: REGEX,
    expr,
    reshape,
  });
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
    reshape: undefined,
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
