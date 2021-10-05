import {
  Node,
  Compiler,
  InputNodeExpr,
  ParseContext,
  RuleParser,
  NodeBase,
  ErrorType,
  Token,
  nodeBaseDefault,
  NodeKind,
  Parser,
  Seq,
  Ref,
  Not,
  Or,
  Eof,
  Recursion,
  Repeat,
  Atom,
  Builder,
} from "./types";
import { readPairedBlock } from "./utils";
import { createParseError, createParseSuccess, defaultReshape } from "./index";

export function createRef(refId: string | number, reshape?: Parser): Ref {
  return {
    ...nodeBaseDefault,
    id: "symbol:" + Math.random().toString(36).substr(2, 9),
    kind: NodeKind.REF,
    ref: refId.toString(),
    reshape,
  } as Ref;
}

export function createBuilder<ID extends number = number>(opts: Compiler<ID>) {
  let cnt = 0;
  const genId = () => (cnt++).toString();
  const exprCache: { [key: string]: Token } = {};
  const refSet = new Set(Object.values(opts.refs)) as Set<ID | symbol>;

  const toNode = (input: InputNodeExpr): Node => {
    if (typeof input === "object") {
      return input;
    }
    if (typeof input === "number") {
      if (!refSet.has(input as ID)) {
        throw new Error(
          `[pargen:convert-expr-to-node] Ref ${
            (opts.refs as any)[input]
          }:${input} not found`
        );
      }
      return ref(input);
    }
    return typeof input === "string" ? token(input) : input;
  };

  function defineRule<T extends NodeBase>(kind: any, parser: RuleParser<T>) {
    const newRule = <T extends NodeBase>(node: T, opts: Compiler<any>) => {
      const parse = parser(node as any, opts);
      return (input: string, ctx: ParseContext) => {
        const ret = parse(input, ctx);
        if (ret == null) {
          return createParseError(kind, ErrorType.Atom_ParseError, ctx.pos);
        }
        if (typeof ret === "number") {
          return createParseSuccess(
            input.slice(ctx.pos, ctx.pos + ret),
            ctx.pos,
            ret
          );
        }
        const [out, len] = ret;
        return createParseSuccess(out, ctx.pos, len);
      };
    };
    opts.rules[kind] = newRule as any;
    return (args: Omit<T, keyof NodeBase>) => {
      return {
        ...nodeBaseDefault,
        id: kind + ":" + genId(),
        kind: kind,
        ...args,
      } as T;
    };
  }

  // inline define
  const createPair = defineRule(
    NodeKind.PAIR,
    (
      node: NodeBase & { open: string; close: string },
      _compileCtx: Compiler<any>
    ) => {
      return (input: string, ctx: ParseContext) => {
        const pairedEnd = readPairedBlock(ctx.tokenMap, ctx.pos, input.length, [
          node.open,
          node.close,
        ]);
        if (pairedEnd) {
          return pairedEnd - ctx.pos;
        }
        return;
      };
    }
  );

  function def<T extends ID | Symbol>(id: T | symbol, node: InputNodeExpr): T {
    if (typeof id === "symbol") {
      refSet.add(id);
    }
    if (opts.patterns[id as any]) {
      throw new Error(`Symbol:${id.toString()} is already defined`);
    }
    opts.patterns[id as any] = () => {
      throw new Error("Override me");
    };
    const parser = opts.compile(toNode(node));
    opts.patterns[id as any] = parser as any;
    return id as any;
  }

  function ref(refId: string | number, reshape?: Parser): Ref {
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
    reshape?: Parser
  ): Seq {
    let nodes: Node[] = [];
    if (opts.composeTokens) {
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
          currentTokens.push(child.expr);
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
      nodes = children.map((child): Node => {
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

  function not(child: InputNodeExpr, reshape?: Parser): Not {
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
    patterns: Array<Seq | Token | Ref | Or | Eof | string | ID | Recursion>,
    reshape?: Parser
  ): Or {
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
    reshape?: Parser<any, any>
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

  function token(expr: string, reshape?: Parser<any, any>): Token {
    if (exprCache[expr]) {
      return exprCache[expr];
    }
    return (exprCache[expr] = {
      ...nodeBaseDefault,
      id: `expr:${expr}`,
      kind: NodeKind.TOKEN,
      expr,
      reshape,
    });
  }

  function eof(): Eof {
    return {
      ...nodeBaseDefault,
      id: "EOF",
      kind: NodeKind.EOF,
      reshape: undefined,
    };
  }

  function atom(parse: Parser): Atom {
    return {
      ...nodeBaseDefault,
      id: "atom:" + genId(),
      kind: NodeKind.ATOM,
      parse,
    };
  }

  function param<T extends Node>(key: string, node: InputNodeExpr): T {
    return { ...(toNode(node) as T), key };
  }

  const RECURSION_ID = "RECURSION";
  const builder: Builder<ID> = {
    def,
    ref,
    tok: token,
    repeat,
    atom,
    or,
    seq,
    pair: createPair as any,
    not,
    param,
    eof,
    R: {
      id: RECURSION_ID,
      kind: NodeKind.RECURSION,
      reshape: undefined,
    },
    repeat_seq(input, minmax, reshape) {
      return repeat(seq(input), minmax, reshape);
    },
    opt<T extends Node>(input: InputNodeExpr): T {
      return { ...(toNode(input) as T), optional: true };
    },
    skip<T extends Node>(node: InputNodeExpr): T {
      return { ...(toNode(node) as T), skip: true };
    },
    skip_opt<T extends Node>(node: InputNodeExpr): T {
      return { ...(toNode(node) as T), skip: true, optional: true };
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
