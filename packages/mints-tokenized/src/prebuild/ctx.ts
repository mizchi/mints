import { createContext } from "../../../pargen-tokenized/src/index";
import { getFuncs } from "../runtime/funcs";

const compile = createContext(getFuncs());

export { compile };
