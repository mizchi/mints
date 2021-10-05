import { createContext } from "../index";
import { NodeTypes } from "./constants";
const { compile, builder } = createContext<NodeTypes>({
  composeTokens: false,
  refs: NodeTypes,
  pairs: ["{", "}"],
});
export { compile, builder };
