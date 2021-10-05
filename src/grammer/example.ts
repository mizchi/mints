import { createContext } from "..";
import { Builder } from "../types";
import { Ast, initGrammerParser, Program } from "./index";

const example = `
ident = "([a-zA-Z_$][a-zA-Z0-9_$]*)";
member = ident "\\." ident;
start = member;
`;

const parse = initGrammerParser();
const parsed = parse(example).result;
console.log("grammer", parsed);

function buildParser(ast: Ast, $: Builder) {
  switch (ast.type) {
    case "def": {
      return {
        wip: true,
        name: ast.name.name,
      };
    }
  }
}

function buildProgram(ast: Program) {
  const { builder, compile } = createContext({});
  const defs = [];
  let entry = null;
  ast.statements.forEach((s) => {
    if (s.type === "def") {
      // TODO: Compile
      defs.push(buildParser(s, builder));
      if (s.name.name === "start") {
        entry = s;
      }
    }
  });
  return { entry, defs };
}

const defs = buildProgram(parsed);
console.log(defs);
