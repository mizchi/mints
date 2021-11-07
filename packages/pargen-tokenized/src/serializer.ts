import {
  REGEX,
  Rule,
  SEQ,
  SerializedRule,
  SerializedToken,
  TOKEN,
} from "./types";

// const NULL_FUNCTION_PTR = 0;
const NULL_STRING_PTR = 0;

// WIP
export function createSerializer() {
  // let funcPtr = 1;
  // const funcMap = new Map<Function, number>();
  // function addFunc(s: Function | null | void) {
  //   if (s == null) return NULL_FUNCTION_PTR;
  //   if (funcMap.has(s)) {
  //     return funcMap.get(s)!;
  //   }
  //   const id = funcPtr++;
  //   funcMap.set(s, id);
  //   return id;
  // }

  let stringPtr = 1;
  const stringMap = new Map<string, number>();
  function addString(s: string | null | void) {
    if (s == null) return NULL_STRING_PTR;
    if (stringMap.has(s)) {
      return stringMap.get(s)!;
    }
    const id = stringPtr++;
    stringMap.set(s, id);
    return id;
  }

  // const NULL_STRING_PTR = 0;
  let childrenPtr = 1;
  const childrenMap = new Map<number, number[]>();
  function addChildren(childrenIds: number[]) {
    const id = childrenPtr++;
    childrenMap.set(id, childrenIds);
    return id;
  }

  const serialize = (node: Rule): SerializedRule => {
    // node base flags
    // const flags = (node.opt ? 0b1 : 0) + (node.skip ? 0b10 : 0);
    // const body: SerializedRuleBody = [
    //   node.id,
    //   // flags,
    //   // addString(node.key),
    //   addFunc(undefined),
    //   // addFunc(node.reshape),
    // ];
    if (node.kind === TOKEN) {
      return [node.kind, node.expr] as SerializedToken;
    }
    if (node.kind === REGEX) {
      // @ts-ignore
      return [node.kind, addString(node.expr)];
    }
    if (node.kind === SEQ) {
      // @ts-ignore
      node.children.forEach(serialize);
      // @ts-ignore
      return [node.kind, addChildren(node.children.map((x) => x.id))];
    }

    throw new Error("Unsupported node kind");
  };
  return { serialize, stringMap };
}
