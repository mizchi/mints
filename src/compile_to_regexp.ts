import { Node, Kind } from "./types";

const concat = <T>(items: T[], fn: (t: T) => string) =>
  items.reduce((acc: string, item: T) => acc + fn(item), "");

export function compileToRegexp(node: Node): string {
  switch (node.kind) {
    case Kind.EXPR: {
      return node.expr;
    }
    case Kind.OR: {
      const patterns = node.patterns.map(compileToRegexp);
      return "(" + patterns.join("|") + ")";
    }
    case Kind.REPEAT: {
      const pattern = compileToRegexp(node.pattern);
      return `(${pattern}){0,}`;
    }
    case Kind.SEQ: {
      return concat(node.children, compileToRegexp);
    }
    default: {
      throw new Error("WIP expr and parser");
    }
  }
}
