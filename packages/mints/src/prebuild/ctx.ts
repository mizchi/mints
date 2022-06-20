import { createContext } from "../../../pargen/src/index";
import { funcs } from "../runtime/funcs";

const compile = createContext(funcs);

export { compile };
