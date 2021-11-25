import { createContext } from "../../../pargen-tokenized/src/index";
import { funcs } from "../runtime/funcs";

const compile = createContext(funcs);

export { compile };
