import { createContext } from "../../pargen-tokenized/src/index";
import { getFuncs } from "./funcs";

const compile = createContext(getFuncs());

export { compile };
