import { createContext } from "@mizchi/pargen/src";
const { compile, builder } = createContext<number>({
  composeTokens: true,
  pairs: ["{", "}"],
});
export { compile, builder };
