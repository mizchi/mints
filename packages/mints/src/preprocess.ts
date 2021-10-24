export function escapeWhistespace(input: string) {
  return input
    .replace(/[ ]{1,}/gmu, (text) => `@W${text.length}}`)
    .replace(/\n{1,}/gmu, (text) => `@N${text.length}}`);
}

export function restoreEscaped(input: string, literals: Map<string, string>) {
  return input.replace(/@(W|L|N)(\d+)\}/g, (full, type, $2) => {
    if (type === "L") {
      return literals.get(full) as string;
    }
    if (type === "W") {
      return " ".repeat(Number($2));
    }
    if (type === "N") {
      return "\n".repeat(Number($2));
    }
    throw new Error(`Unknown type ${type}`);
  });
}

export function escapeLiteral(input: string) {
  const literals = new Map();
  let cnt = 1;
  const escaped = input.replace(
    /"[^"]*"|'[^']*'|`[^`]*`|\/!\*[^\/]*!\*\//gmu,
    (text) => {
      const key = `@L${cnt++}}`;
      literals.set(key, text);
      return key;
    }
  );
  return { escaped, literals };
}

export function preprocessLight(input: string) {
  const { escaped, literals } = escapeLiteral(input);
  const out = escaped
    // delete inline comments /*...*/
    .replace(/\/\*(.*?)\*\//gmu, "")
    // delete comment line
    .replace(/(.*?)(\/\/.*)/gu, "$1")
    // delete redundunt semicollon except for statement
    .replace(/(?<!for\s?\()([\n\r\t; ]*;[\n\r\t ;]*)(?!\))/gmu, ";")
    // delete redundant whitespaces
    .replace(/[ \t]+/gmu, " ")
    // delete redundunt whitespaces after control token
    .replace(/([\}\{\(\)\n\r,;><])[\n\r\t]+\s*/gmu, (_, $1) => $1);
  return restoreEscaped(out, literals);
}
export function preprocess(input: string) {
  const { escaped, literals } = escapeLiteral(input);
  const modified = escaped
    // delete inline comments
    .replace(/\/\*([.\n]*?)\*\//gmu, "")
    // delete line comments
    .replace(/(.*)(\/\/.*)/gu, "$1");
  const escaped2 = escapeWhistespace(modified);
  return { out: escaped2, data: literals };
}

export function postprocess(out: string, literals: Map<string, string>) {
  return restoreEscaped(out, literals);
}

import { is, run, test } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const now = Date.now();
  test("escape literal", () => {
    is(escapeLiteral(`"x"`), { escaped: `@L1}` });
    is(escapeLiteral(`"x" "y"`), { escaped: `@L1} @L2}` });
    is(escapeLiteral(`"x" "y" 'zzz'`), { escaped: `@L1} @L2} @L3}` });
    const e = escapeLiteral(`"x" "y" 'zzz'`);
    is(restoreEscaped(e.escaped, e.literals), `"x" "y" 'zzz'`);
  });

  test("tokenize whitespace", () => {
    is(escapeWhistespace(` a`), `@W1}a`);
    is(escapeWhistespace(`  a`), `@W2}a`);
    is(escapeWhistespace(`  a `), `@W2}a@W1}`);
    is(restoreEscaped(escapeWhistespace(`  a  `), new Map()), `  a  `);
  });

  // class X{f() {1;\t\t\n \nconst y = 1;\t}}
  test("preprocessLight", () => {
    is(preprocessLight(`  a  \n`), ` a \n`);
    is(preprocessLight(`  a  \nb`), ` a \nb`);
    is(
      preprocessLight(`class X{
	f() {
    1;
		// x
    // y

		const y = 1;
	}
}
`),
      `class X{f() {1;const y = 1;}}`
    );
    is(preprocessLight(``), ``);
  });

  test("strip inline comment", () => {
    is(preprocess("/**/").out, "");
    is(preprocess("/**/a/**/").out, "a");
    is(preprocess("/*\n*/ax/**/").out, "ax");
  });

  test("line comment", () => {
    is(preprocess("a").out, "a");
    is(preprocess("//a").out, "");
    is(preprocess(" //a").out, "@W1}");
    is(preprocess("//a\n//b").out, "@N1}");
    is(preprocess("a//a\n//b").out, "a@N1}");
    is(preprocess("a//a\n//b").out, "a@N1}");
    is(preprocess("a\n//xxx\n").out, "a@N2}");
  });

  run({ stopOnFail: true, stub: true, isMain }).then(() => {
    console.log("[test:time]", Date.now() - now);
  });
}
