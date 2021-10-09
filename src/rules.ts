import { RuleDefinition, Rule } from "./types";
import { readPairedBlock } from "./utils";

export type Pair = { open: string; close: string };

export const pairRule: RuleDefinition<Pair> = {
  kind: "pair",
  compile(node, _compiler) {
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

// wip
export type Not = { child: Rule };
export const notRule: RuleDefinition<Not, [child: Rule]> = {
  kind: "not",
  builder: (input) => {
    return {
      child: input,
    };
  },
  compile(node, compiler) {
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
