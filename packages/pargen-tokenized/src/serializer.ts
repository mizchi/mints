// import type {
//   Rule,
//   SerializedNot,
//   SerializedRule,
//   SerializedToken,
// } from "./types";
// import {
//   RULE_ATOM,
//   RULE_NOT,
//   RULE_REGEX,
//   RULE_SEQ,
//   RULE_TOKEN,
// } from "./constants";

// // const NULL_FUNCTION_PTR = 0;
// const NULL_STRING_PTR = 0;

// // WIP
// export function createSerializer() {
//   // let funcPtr = 1;
//   // const funcMap = new Map<Function, number>();
//   // function addFunc(s: Function | null | void) {
//   //   if (s == null) return NULL_FUNCTION_PTR;
//   //   if (funcMap.has(s)) {
//   //     return funcMap.get(s)!;
//   //   }
//   //   const id = funcPtr++;
//   //   funcMap.set(s, id);
//   //   return id;
//   // }

//   let stringPtr = 1;
//   const stringMap = new Map<string, number>();
//   function addString(s: string | null | void) {
//     if (s == null) return NULL_STRING_PTR;
//     if (stringMap.has(s)) {
//       return stringMap.get(s)!;
//     }
//     const id = stringPtr++;
//     stringMap.set(s, id);
//     return id;
//   }

//   // const NULL_STRING_PTR = 0;
//   let childrenPtr = 1;
//   const childrenMap = new Map<number, number[]>();
//   function addChildren(childrenIds: number[]) {
//     const id = childrenPtr++;
//     childrenMap.set(id, childrenIds);
//     return id;
//   }

//   const serialize = (rule: Rule): SerializedRule => {
//     // node base flags
//     // const flags = (node.opt ? 0b1 : 0) + (node.skip ? 0b10 : 0);
//     // const body: SerializedRuleBody = [
//     //   node.id,
//     //   // flags,
//     //   // addString(node.key),
//     //   addFunc(undefined),
//     //   // addFunc(node.reshape),
//     // ];
//     if (rule.kind === RULE_TOKEN) {
//       return [rule.kind, addString(rule.expr)] as SerializedToken;
//     }
//     if (rule.kind === RULE_REGEX) {
//       // @ts-ignore
//       return [rule.kind, addString(rule.expr)];
//     }
//     if (rule.kind === RULE_SEQ) {
//       // @ts-ignore
//       rule.children.forEach(serialize);
//       // @ts-ignore
//       return [rule.kind, addChildren(rule.children.map((x) => x.id))];
//     }

//     if (rule.kind === RULE_ATOM) {
//       return [rule.kind] as any;
//     }

//     if (rule.kind === RULE_NOT) {
//       return [rule.kind, rule.expr] as SerializedNot;
//     }

//     throw new Error(`Unsupported node kind: ${rule.kind}`);
//   };
//   return { serialize, stringMap };
// }
