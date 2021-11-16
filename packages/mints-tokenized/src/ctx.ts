import { createContext } from "../../pargen-tokenized/src/index";
const compile = createContext();

const defaultJsx = "React.createElement";
const defaultJsxFragment = "React.Fragment";

export let config = {
  jsx: defaultJsx,
  jsxFragment: defaultJsxFragment,
};

export { compile };
