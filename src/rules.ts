import { Rule, Node } from "./types";
import { readPairedBlock } from "./utils";

export type Pair = { open: string; close: string };

export const pairRule: Rule<Pair> = {
  kind: "pair",
  run(node, _compiler) {
    return (input, ctx) => {
      const pairedEnd = readPairedBlock(ctx.tokenMap, ctx.pos, input.length, [
        node.open,
        node.close,
      ]);
      if (pairedEnd) {
        return pairedEnd - ctx.pos;
      }
      return;
    };
  },
};

export type Not = { child: Node };
export const notRule: Rule<Not, [child: Node]> = {
  kind: "not",
  builder: (input) => {
    return {
      child: input,
    };
  },
  run(node, compiler) {
    const childParser = compiler.compile(node.child);
    return (input, ctx) => {
      const result = childParser(input, ctx);
      if (result.error === true) {
        return [result, 0];
      }
      return;
    };
  },
};
