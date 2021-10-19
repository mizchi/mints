import { createContext } from "@mizchi/pargen/src";
const { compile, builder } = createContext<number>({
  composeTokens: true,
  // refs: NodeTypes,
  pairs: ["{", "}"],
});
export { compile, builder };
