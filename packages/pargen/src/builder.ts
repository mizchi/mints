import {
  Rule,
  Compiler,
  InputNodeExpr,
  Token,
  nodeBaseDefault,
  NodeKind,
  Reshape,
  Seq,
  Ref,
  Not,
  Or,
  Eof,
  Repeat,
  Atom,
  Builder,
  defaultReshape,
  Parser,
  Regex,
} from "./types";

export function createRef(refId: string | number, reshape?: Reshape): Ref {
  return {
    ...nodeBaseDefault,
    id: "symbol:" + Math.random().toString(36).substr(2, 9),
    kind: NodeKind.REF,
    ref: refId.toString(),
    reshape,
  } as Ref;
}

export function createBuilder(compiler: Compiler) {
  let cnt = 0;
  const genId = () => (cnt++).toString();
  const toNode = (input: InputNodeExpr): Rule => {
    if (typeof input === "object") {
      return input;
    }
    if (typeof input === "number") {
      return ref(input);
    }
    return typeof input === "string" ? token(input) : input;
  };

  const registeredPatterns: Array<[number, () => InputNodeExpr]> = [];
  const _hydratePatterns = () => {
    registeredPatterns.forEach(([id, nodeCreator]) => {
      const node = nodeCreator();
      compiler.defs[id as any] = () => {
        throw new Error("Override me");
      };
      const parser = compiler.compile(toNode(node));
      compiler.defs[id as any] = parser as any;
    });
    registeredPatterns.length = 0;
  };

  let _cnt = 1024;
  function def(nodeCreator: () => InputNodeExpr): number {
    const id = _cnt++;
    registeredPatterns.push([id as any, nodeCreator]);
    return id;
  }

  function ref(refId: string | number, reshape?: Reshape): Ref {
    return {
      ...nodeBaseDefault,
      id: "symbol:" + genId(),
      kind: NodeKind.REF,
      ref: refId.toString(),
      reshape,
    } as Ref;
  }

  function seq(
    children: Array<InputNodeExpr | [key: string, ex: InputNodeExpr]>,
    reshape?: Reshape
  ): Seq {
    let nodes: Rule[] = [];
    if (compiler.composeTokens) {
      // compose token
      let currentTokens: string[] = [];
      children.forEach((child) => {
        if (typeof child === "string") {
          currentTokens.push(child);
        } else if (
          // plane expr
          typeof child !== "number" &&
          !Array.isArray(child) &&
          !child.skip &&
          child.kind === NodeKind.TOKEN &&
          child.reshape === defaultReshape &&
          child.key == null
        ) {
          currentTokens.push((child as Token).expr);
        } else {
          // compose queued expr list to one expr
          if (currentTokens.length > 0) {
            nodes.push(token(currentTokens.join("")));
            currentTokens = [];
          }

          if (Array.isArray(child)) {
            const [key, ex] = child;
            nodes.push(param(key, toNode(ex)));
          } else {
            // raw expr
            nodes.push(toNode(child));
          }
        }
      });
      nodes.push(token(currentTokens.join("")));
    } else {
      // do not compose for debug
      nodes = children.map((child): Rule => {
        if (Array.isArray(child)) {
          const [key, ex] = child;
          return param(key, toNode(ex));
        } else {
          return toNode(child);
        }
      });
    }
    return {
      ...nodeBaseDefault,
      reshape,
      id: "seq:" + genId(),
      kind: NodeKind.SEQ,
      children: nodes,
    } as Seq;
  }

  function not(child: InputNodeExpr, reshape?: Reshape): Not {
    const childNode = toNode(child);
    return {
      ...nodeBaseDefault,
      kind: NodeKind.NOT,
      child: childNode,
      reshape,
      id: "not:" + childNode.id,
    } as Not;
  }

  function or(
    patterns: Array<Seq | Token | Ref | Or | Eof | string | number>,
    reshape?: Reshape
  ): Or | Rule {
    if (patterns.length === 1) {
      return toNode(patterns[0]);
    }
    return {
      ...nodeBaseDefault,
      kind: NodeKind.OR,
      patterns: patterns.map(toNode) as Array<Seq | Token | Ref>,
      reshape,
      id: "or:" + genId(),
    } as Or;
  }

  function repeat(
    pattern: InputNodeExpr,
    minmax?: [min: number | void, max?: number | void],
    reshape?: Reshape<any, any>
  ): Repeat {
    const [min = 0, max = undefined] = minmax ?? [];
    return {
      ...nodeBaseDefault,
      id: "repeat:" + genId(),
      kind: NodeKind.REPEAT,
      pattern: toNode(pattern),
      min,
      max,
      reshape,
    };
  }

  const exprCache: { [key: string]: Token } = {};
  function token(expr: string, reshape?: Reshape<any, any>): Token {
    if (exprCache[expr]) return exprCache[expr];
    return (exprCache[expr] = {
      ...nodeBaseDefault,
      id: `expr:${expr}`,
      kind: NodeKind.TOKEN,
      expr,
      reshape,
    });
  }

  const regexCache: { [key: string]: Regex } = {};
  function regex(expr: string, reshape?: Reshape<any, any>): Regex {
    if (regexCache[expr]) return regexCache[expr];
    return (regexCache[expr] = {
      ...nodeBaseDefault,
      id: `expr:${expr}`,
      kind: NodeKind.REGEX,
      expr,
      reshape,
    });
  }
  // regex sharthand
  function r(...expr: string[]): Regex {
    return regex(expr.join(""));
  }

  function eof(): Eof {
    return {
      ...nodeBaseDefault,
      id: "EOF",
      kind: NodeKind.EOF,
      reshape: undefined,
    };
  }

  function atom(parser: Parser): Atom {
    return {
      ...nodeBaseDefault,
      id: "atom:" + genId(),
      kind: NodeKind.ATOM,
      parse: parser,
    };
  }

  function param<T extends Rule>(key: string, node: InputNodeExpr): T {
    return { ...toNode(node), key } as T;
  }

  const builder: Builder = {
    close: _hydratePatterns,
    def,
    ref,
    tok: token,
    repeat,
    atom,
    or,
    seq,
    // pair: createPair as any,
    not,
    param,
    eof,
    regex,
    r: r,
    repeat_seq(input, minmax, reshape) {
      return repeat(seq(input), minmax, reshape);
    },
    opt<T extends Rule>(input: InputNodeExpr): T {
      return { ...toNode(input), optional: true } as T;
    },
    skip<T extends Rule>(node: InputNodeExpr): T {
      return { ...toNode(node), skip: true } as T;
    },
    skip_opt<T extends Rule>(node: InputNodeExpr): T {
      return { ...toNode(node), skip: true, optional: true } as T;
    },
    join(...expr: string[]): Token {
      return token(expr.join(""));
    },
    ["!"]: not,
    ["*"](input: InputNodeExpr[]) {
      return repeat(seq(input), [0]);
    },
    ["+"](input: InputNodeExpr[]) {
      return repeat(seq(input), [1]);
    },
  };

  return builder;
}
