import { createContext } from "../index";
import type { NodeTypes } from "./constants";
const { compile, builder } = createContext<NodeTypes>();
export { compile, builder };
