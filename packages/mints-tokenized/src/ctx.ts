import { createContext } from "../../pargen-tokenized/src/index";
import { funcs } from "./funcs";

const compile = createContext(funcs);
const defaultJsx = "React.createElement";
const defaultJsxFragment = "React.Fragment";

export let config = {
  jsx: defaultJsx,
  jsxFragment: defaultJsxFragment,
};

export { compile };
