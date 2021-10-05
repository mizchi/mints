import { Rule } from "./types";
import { readPairedBlock } from "./utils";

export const pairRule: Rule<{ open: string; close: string }> = {
  kind: "pair",
  run(node, compiler) {
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
