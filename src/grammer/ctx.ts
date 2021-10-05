import { createContext } from "../index";
// import { NodeTypes } from "./constants";
export enum NodeTypes {
  Define = 512,
  Comment,
  Or,
  Paren,
  Empty,
  UnaryExpression,
  Expression,
  Sequence,
  Program,
}
const { compile, builder } = createContext<NodeTypes>({
  composeTokens: false,
  refs: NodeTypes,
});
export { compile, builder };
