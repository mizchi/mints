import { fail, success } from "../../../pargen-tokenized/src/runtime";
import type {
  InternalParser,
  ParseContext,
} from "../../../pargen-tokenized/src/types";
import {
  ACCESS,
  ARGS,
  ASSIGN,
  ATTRIBUTES,
  BODY,
  CHILDREN,
  CODE,
  IDENT,
  INIT,
  ITEMS,
  LAST,
  NAME,
  VALUE,
} from "../prebuild/constants";

import reserved from "./reserved.json";
import strings from "./strings.json";

type ParsedCostructorArg = {
  [INIT]: string | null;
  [CODE]: string;
};

export const funcs: Array<Function> = [() => {}];

function addFunc(fn: Function) {
  const id = funcs.length;
  funcs.push(fn);
  return id;
}

// TODO: prebuild
const __reservedWordsByLength: Map<number, string[]> = new Map();
for (const word of reserved.map((x) => strings[x])) {
  const words = __reservedWordsByLength.get(word.length) ?? [];
  __reservedWordsByLength.set(word.length, [...words, word].sort());
}

const identParser: InternalParser = (ctx, pos) => {
  const token = ctx.t[pos] ?? "";
  const errorData = { code: 255, token } as any;
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
    [IDENT]: (string | { [ACCESS]: string; [IDENT]: string })[] | [{}];
    [INIT]: string[];
  }
]): ParsedCostructorArg => {
  if (typeof input[IDENT][0] === "object") {
    // @ts-ignore
    const ident = input[IDENT][0][IDENT].join("");
    return {
      [INIT]: ident,
      [CODE]: ident + (input[INIT]?.join("") ?? ""),
    };
  }
  // @ts-ignore
  return [
    {
      [INIT]: null,
      [CODE]: input[IDENT].join("") + (input[INIT]?.join("") ?? ""),
    },
  ];
};

const reshapeClassConstructor = ([input]: [
  {
    [ARGS]: Array<ParsedCostructorArg>;
    [LAST]: Array<ParsedCostructorArg>;
    [BODY]: number[];
  }
]) => {
  const argList = [...(input[ARGS] ?? []), ...(input[LAST] ?? [])];
  let bodyIntro = "";
  let args: string[] = [];
  for (const arg of argList) {
    if (arg[INIT]) bodyIntro += `this.${arg[INIT]}=${arg[INIT]};`;
    args.push(arg[CODE]);
  }
  const bodyCode = input[BODY].join("");
  return [`constructor(${args.join(",")}){${bodyIntro}${bodyCode}}`];
};

const reshapeEnum = ([input]: [
  {
    [NAME]: string;
    [ITEMS]: Array<{ [IDENT]: string[]; [ASSIGN]?: string[] }>;
    [LAST]?: Array<{ [IDENT]: string[]; [ASSIGN]?: string[] }>;
  }
]) => {
  let baseValue = 0;
  let out = `const ${input[NAME]}={`;
  for (const item of [...(input[ITEMS] ?? []), ...(input[LAST] ?? [])]) {
    let val: string | number;
    if (item[ASSIGN]) {
      const num = Number(item[ASSIGN]);
      if (isNaN(num)) {
        console.log(item, ASSIGN);
        val = item[ASSIGN]!.join("") as string;
      } else {
        val = num;
        baseValue = num + 1;
      }
    } else {
      val = baseValue;
      baseValue++;
    }
    const key = item[IDENT].join("");
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
  while (i < ctx.t.length) {
    const token = ctx.t[pos + i];
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
  return ctx.t[a[0]] === ctx.t[b[0]];
};

const jsx = "React.createElement";
const jsxFragment = "React.Fragment";

const buildJsxCode = (
  ctx: ParseContext,
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
  // console.log("ctx", ctx.opts);
  if (ident === "") element = ctx.opts.jsxFragment ?? jsxFragment;
  const factory = ctx.opts.jsx ?? jsx;
  // console.log("jsx build", factory, ctx.opts);
  return `${factory}(${element}${data}${childrenCode})`;
};

const reshapeJsxElement = (
  [input]: [
    {
      [IDENT]: string[];
      [ATTRIBUTES]: Array<{ [NAME]: string[]; [VALUE]: string[] }>;
      [CHILDREN]: Array<string[]>;
    }
  ],
  ctx: ParseContext
) => {
  // console.log("children", input[CHILDREN]);
  return [
    buildJsxCode(
      ctx,
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

const reshapeJsxSelfClosingElement = (
  [input]: [
    {
      [IDENT]: string[];
      [ATTRIBUTES]: Array<{ [NAME]: string[]; [VALUE]?: string[] }>;
    }
  ],
  ctx: ParseContext
) => {
  return [
    buildJsxCode(
      ctx,
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
