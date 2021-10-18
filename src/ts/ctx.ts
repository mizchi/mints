import { createContext } from "../index";
import { NodeTypes } from "./constants";
const { compile, builder } = createContext<NodeTypes>({
  composeTokens: true,
  refs: NodeTypes,
  pairs: ["{", "}"],
});
export { compile, builder };
