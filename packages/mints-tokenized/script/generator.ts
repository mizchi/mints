// import {charCodes} from "../src/parser/util/charcodes";
export enum charCodes {
  backSpace = 8,
  lineFeed = 10, //  '\n'
  carriageReturn = 13, //  '\r'
  shiftOut = 14,
  space = 32,
  exclamationMark = 33, //  '!'
  quotationMark = 34, //  '"'
  numberSign = 35, //  '#'
  dollarSign = 36, //  '$'
  percentSign = 37, //  '%'
  ampersand = 38, //  '&'
  apostrophe = 39, //  '''
  leftParenthesis = 40, //  '('
  rightParenthesis = 41, //  ')'
  asterisk = 42, //  '*'
  plusSign = 43, //  '+'
  comma = 44, //  ','
  dash = 45, //  '-'
  dot = 46, //  '.'
  slash = 47, //  '/'
  digit0 = 48, //  '0'
  digit1 = 49, //  '1'
  digit2 = 50, //  '2'
  digit3 = 51, //  '3'
  digit4 = 52, //  '4'
  digit5 = 53, //  '5'
  digit6 = 54, //  '6'
  digit7 = 55, //  '7'
  digit8 = 56, //  '8'
  digit9 = 57, //  '9'
  colon = 58, //  ':'
  semicolon = 59, //  ';'
  lessThan = 60, //  '<'
  equalsTo = 61, //  '='
  greaterThan = 62, //  '>'
  questionMark = 63, //  '?'
  atSign = 64, //  '@'
  uppercaseA = 65, //  'A'
  uppercaseB = 66, //  'B'
  uppercaseC = 67, //  'C'
  uppercaseD = 68, //  'D'
  uppercaseE = 69, //  'E'
  uppercaseF = 70, //  'F'
  uppercaseG = 71, //  'G'
  uppercaseH = 72, //  'H'
  uppercaseI = 73, //  'I'
  uppercaseJ = 74, //  'J'
  uppercaseK = 75, //  'K'
  uppercaseL = 76, //  'L'
  uppercaseM = 77, //  'M'
  uppercaseN = 78, //  'N'
  uppercaseO = 79, //  'O'
  uppercaseP = 80, //  'P'
  uppercaseQ = 81, //  'Q'
  uppercaseR = 82, //  'R'
  uppercaseS = 83, //  'S'
  uppercaseT = 84, //  'T'
  uppercaseU = 85, //  'U'
  uppercaseV = 86, //  'V'
  uppercaseW = 87, //  'W'
  uppercaseX = 88, //  'X'
  uppercaseY = 89, //  'Y'
  uppercaseZ = 90, //  'Z'
  leftSquareBracket = 91, //  '['
  backslash = 92, //  '\    '
  rightSquareBracket = 93, //  ']'
  caret = 94, //  '^'
  underscore = 95, //  '_'
  graveAccent = 96, //  '`'
  lowercaseA = 97, //  'a'
  lowercaseB = 98, //  'b'
  lowercaseC = 99, //  'c'
  lowercaseD = 100, //  'd'
  lowercaseE = 101, //  'e'
  lowercaseF = 102, //  'f'
  lowercaseG = 103, //  'g'
  lowercaseH = 104, //  'h'
  lowercaseI = 105, //  'i'
  lowercaseJ = 106, //  'j'
  lowercaseK = 107, //  'k'
  lowercaseL = 108, //  'l'
  lowercaseM = 109, //  'm'
  lowercaseN = 110, //  'n'
  lowercaseO = 111, //  'o'
  lowercaseP = 112, //  'p'
  lowercaseQ = 113, //  'q'
  lowercaseR = 114, //  'r'
  lowercaseS = 115, //  's'
  lowercaseT = 116, //  't'
  lowercaseU = 117, //  'u'
  lowercaseV = 118, //  'v'
  lowercaseW = 119, //  'w'
  lowercaseX = 120, //  'x'
  lowercaseY = 121, //  'y'
  lowercaseZ = 122, //  'z'
  leftCurlyBrace = 123, //  '{'
  verticalBar = 124, //  '|'
  rightCurlyBrace = 125, //  '}'
  tilde = 126, //  '~'
  nonBreakingSpace = 160,
  // eslint-disable-next-line no-irregular-whitespace
  oghamSpaceMark = 5760, // ' '
  lineSeparator = 8232,
  paragraphSeparator = 8233,
}

const KEYWORDS = [
  "break",
  "case",
  "catch",
  "continue",
  "debugger",
  "default",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "return",
  "switch",
  "throw",
  "try",
  "var",
  "while",
  "with",
  "null",
  "true",
  "false",
  "instanceof",
  "typeof",
  "void",
  "delete",
  "new",
  "in",
  "this",
  "let",
  "const",
  "class",
  "extends",
  "export",
  "import",
  "yield",
  "super",
];

const CONTEXTUAL_KEYWORDS = [
  "abstract",
  "as",
  "asserts",
  "async",
  "await",
  "checks",
  "constructor",
  "declare",
  "enum",
  "exports",
  "from",
  "get",
  "global",
  "implements",
  "infer",
  "interface",
  "is",
  "keyof",
  "mixins",
  "module",
  "namespace",
  "of",
  "opaque",
  "private",
  "protected",
  "override",
  "proto",
  "public",
  "readonly",
  "require",
  "set",
  "static",
  "type",
  "unique",
];

const CODE = `\
// Generated file, do not edit! Run "yarn generate" to re-generate this file.
import {ContextualKeyword} from "./keywords";
import {TokenType as tt} from "./types";
// prettier-ignore
export const READ_WORD_TREE = new Int32Array([
$CONTENTS
]);
`;

interface Keyword {
  name: string;
  isContextual: boolean;
}

interface Node {
  prefix: string;
  data: Array<number | string>;
  start: number;
}

const ALL_KEYWORDS: Array<Keyword> = [
  ...KEYWORDS.map((name) => ({ name, isContextual: false })),
  ...CONTEXTUAL_KEYWORDS.map((name) => ({ name, isContextual: true })),
];

function generateReadWordTree(): string {
  const prefixes = new Set<string>();
  for (const { name } of ALL_KEYWORDS) {
    for (let i = 0; i < name.length + 1; i++) {
      prefixes.add(name.slice(0, i));
    }
  }

  const nodesByPrefix: { [prefix: string]: Node } = {};
  const nodes = [...prefixes].sort().map((prefix, i) => {
    const data = [];
    for (let j = 0; j < 27; j++) {
      data.push(-1);
    }
    const node = { prefix, data, start: i * 27 };
    nodesByPrefix[prefix] = node;
    return node;
  });

  for (const { name, isContextual } of ALL_KEYWORDS) {
    // Fill in first index.
    const keywordNode = nodesByPrefix[name];
    if (isContextual) {
      keywordNode.data[0] = `ContextualKeyword._${name} << 1`;
    } else {
      keywordNode.data[0] = `(tt._${name} << 1) + 1`;
    }

    // The later indices are transitions by lowercase letter.
    for (let i = 0; i < name.length; i++) {
      const node = nodesByPrefix[name.slice(0, i)];
      const nextNode = nodesByPrefix[name.slice(0, i + 1)];
      node.data[name.charCodeAt(i) - charCodes.lowercaseA + 1] = nextNode.start;
    }
  }
  return CODE.replace(
    "$CONTENTS",
    nodes
      .map(
        ({ prefix, data }) => `\
  // "${prefix}"
  ${data.map((datum) => `${datum},`).join(" ")}`
      )
      .join("\n")
  );
}

const rtree = generateReadWordTree();
console.log(rtree);
