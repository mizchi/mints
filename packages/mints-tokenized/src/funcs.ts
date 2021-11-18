import { fail, success } from "../../pargen-tokenized/src/runtime";
import { InternalParser, ParseContext } from "../../pargen-tokenized/src/types";
import {
  ATTRIBUTES,
  CHILDREN,
  CONTROL_TOKENS,
  IDENT,
  K_CONSTRUCTOR,
  NAME,
  RESERVED_WORDS,
  VALUE,
} from "./constants";
import { config } from "./ctx";

export const funcs: Array<Function> = [() => {}];
export const getFuncs = () => funcs;

function addFunc(fn: Function) {
  const id = funcs.length;
  funcs.push(fn);
  return id;
}

const __reservedWordsByLength: Map<number, string[]> = new Map();
for (const word of [...CONTROL_TOKENS, ...RESERVED_WORDS]) {
  const words = __reservedWordsByLength.get(word.length) ?? [];
  __reservedWordsByLength.set(word.length, [...words, word].sort());
}

type ParsedCostructorArg = {
  init: string | null;
  code: string;
};

const identParser: InternalParser = (ctx, pos) => {
  const token = ctx.tokens[pos] ?? "";
  const errorData = { code: "IdentifierError", token } as any;
  const len = Array.from(token).length;
  const charCode = token.charCodeAt(0);
  if (len === 0) return fail(pos, errorData);
  const words = __reservedWordsByLength.get(len);
  if (len === 1 && charCode > 127) {
    // Nothing
  } else {
    if (words?.includes(token)) return fail(pos, errorData);
  }
  if (48 <= charCode && charCode <= 57) {
    return fail(pos, errorData);
  }
  return success(pos, 1, [pos]);
};

const createWhitespace = () => " ";

const reshapeClassConstructorArg = ([input]: [
  {
    ident: (string | { access: string; ident: string })[] | [{}];
    init: string[];
  }
]): ParsedCostructorArg => {
  if (typeof input.ident[0] === "object") {
    // @ts-ignore
    const ident = input.ident[0].ident.join("");
    return {
      init: ident,
      code: ident + (input.init?.join("") ?? ""),
    };
  }
  // @ts-ignore
  return [
    {
      init: null,
      code: input.ident.join("") + (input.init?.join("") ?? ""),
    },
  ];
};

const reshapeClassConstructor = ([input]: [
  {
    args: Array<ParsedCostructorArg>;
    last: Array<ParsedCostructorArg>;
    body: number[];
  }
]) => {
  // console.log("constrocutro input", input);
  const argList = [...(input.args ?? []), ...(input.last ?? [])];
  let bodyIntro = "";
  let args: string[] = [];
  for (const arg of argList) {
    if (arg.init) bodyIntro += `this.${arg.init}=${arg.init};`;
    args.push(arg.code);
  }
  const bodyCode = input.body.join("");
  return [`${K_CONSTRUCTOR}(${args.join(",")}){${bodyIntro}${bodyCode}}`];
};

const reshapeEnum = ([input]: [
  {
    enumName: string;
    items: Array<{ ident: string[]; assign?: string[] }>;
    last?: Array<{ ident: string[]; assign?: string[] }>;
  }
]) => {
  let baseValue = 0;
  let out = `const ${input.enumName}={`;
  // console.log("input", input);
  for (const item of [...(input.items ?? []), ...(input.last ?? [])]) {
    let val: string | number;
    if (item.assign) {
      const num = Number(item.assign);
      if (isNaN(num)) {
        val = item.assign.join("") as string;
      } else {
        // reset base value
        val = num;
        baseValue = num + 1;
      }
    } else {
      val = baseValue;
      baseValue++;
    }
    const key = item.ident.join("");
    if (typeof val === "number") {
      out += `${key}:${val},"${val}":"${key}",`;
    } else {
      out += `${key}:${val},`;
    }
  }
  return [out + "};"];
};

const parseJsxText = (ctx: ParseContext, pos: number) => {
  let i = 0;
  const results: string[] = [];
  while (i < ctx.tokens.length) {
    const token = ctx.tokens[pos + i];
    if ([">", "<", "{"].includes(token)) {
      break;
    }
    results.push(token);
    i++;
  }
  if (results.length === 0) {
    return fail(pos, {} as any);
  }
  return success(pos, i, ['"' + results.join(" ") + '"']);
};

const popJsxElement = (a: number[], b: number[], ctx: ParseContext) => {
  // TODO: Multi token equality
  return ctx.tokens[a[0]] === ctx.tokens[b[0]];
};

const buildJsxCode = (
  ident: string,
  attributes: Array<{ [NAME]: string; [VALUE]: string }>,
  children: Array<string> = []
) => {
  // TODO: Detect dom name
  let data = ",{}";
  if (attributes.length > 0) {
    data = ",{";
    for (const attr of attributes) {
      data += `${attr[NAME]}:${attr[VALUE]},`;
    }
    data += "}";
  }
  let childrenCode = "";
  if (children.length > 0) {
    for (const child of children) {
      childrenCode += `,${child}`;
    }
  }
  const isDomPrimitive = /^[a-z-]+$/.test(ident);
  let element = isDomPrimitive ? `"${ident}"` : ident;
  if (ident === "") {
    element = config.jsxFragment;
  }
  return `${config.jsx}(${element}${data}${childrenCode})`;
};

const reshapeJsxElement = ([input]: [
  {
    [IDENT]: string[];
    [ATTRIBUTES]: Array<{ [NAME]: string[]; [VALUE]: string[] }>;
    [CHILDREN]: Array<string[]>;
  }
]) => {
  // console.log("children", input[CHILDREN]);
  return [
    buildJsxCode(
      input[IDENT].join(""),
      input[ATTRIBUTES].map((a) => {
        return {
          [NAME]: a[NAME].join(""),
          [VALUE]: a[VALUE].join(""),
        };
      }),
      input[CHILDREN].flat()
    ),
  ];
};

const reshapeJsxSelfClosingElement = ([input]: [
  {
    [IDENT]: string[];
    [ATTRIBUTES]: Array<{ [NAME]: string[]; [VALUE]?: string[] }>;
  }
]) => {
  return [
    buildJsxCode(
      input[IDENT].join(""),
      input[ATTRIBUTES].map((a) => ({
        [NAME]: a[NAME].join(""),
        [VALUE]: a[VALUE]?.join("") ?? "",
      }))
    ),
  ];
};

export const identParserPtr = addFunc(identParser);
export const createWhitespacePtr = addFunc(createWhitespace);
export const reshapeClassConstructorArgPtr = addFunc(
  reshapeClassConstructorArg
);
export const reshapeClassConstructorPtr = addFunc(reshapeClassConstructor);

export const reshapeEnumPtr = addFunc(reshapeEnum);
export const parseJsxTextPtr = addFunc(parseJsxText);
export const popJsxElementPtr = addFunc(popJsxElement);
export const reshapeJsxElementPtr = addFunc(reshapeJsxElement);
export const reshapeJsxSelfClosingElementPtr = addFunc(
  reshapeJsxSelfClosingElement
);
