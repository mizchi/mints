// export { program } from "./statements";
import { compile, builder as $, NodeTypes } from "./ctx";

const _ = "\\s*";
const __ = "(\\s)+";

export type Program = {
  type: "program";
  statements: Statement[];
};

type Ident = {
  type: "ident";
  name: string;
};

type EmptyStatement = {
  type: "empty";
};
type CommentStatement = {
  type: "comment";
  comment: string;
};

type DefineStatement = {
  type: "def";
  name: Ident;
  value: Ast;
  code?: string;
};

export type Statement = EmptyStatement | CommentStatement | DefineStatement;

export type Ast =
  | Program
  | EmptyStatement
  | CommentStatement
  | DefineStatement
  | {
      type: "not";
      child: Ast;
    }
  | {
      type: "repeat";
      min: number;
      child: Ast;
    }
  | {
      type: "token";
      value: string;
    }
  | Ident
  | {
      type: "or";
      items: Ast[];
    }
  | {
      type: "seq";
      items: Ast[];
    };

const handleUnary = (input: any): Ast => {
  let type = input.body as Ast;
  if (input.postfix === "+") {
    type = {
      type: "repeat",
      child: type,
      min: 1,
    };
  }
  if (input.postfix === "*") {
    type = {
      type: "repeat",
      child: type,
      min: 0,
    };
  }
  if (input.prefix === "!") {
    type = {
      type: "not",
      child: type,
    };
  }
  return type;
};

const Ident = $.tok(
  "([a-zA-Z_$][a-zA-Z0-9_$]*)",
  (input: string): Ast => ({
    type: "ident",
    name: input,
  })
);

const Token = $.tok(
  '(\\"[^\\"]*\\")',
  (input: string): Ast => ({
    type: "token",
    value: input.slice(1, -1),
  })
);

const Or = $.def(
  NodeTypes.Or,
  $.seq(
    [
      ["head", NodeTypes.Sequence],
      _,
      ["tail", $.repeat($.seq(["/", _, ["item", NodeTypes.Sequence]]))],
    ],
    (input) => {
      if (input.tail.length === 0) {
        return input.head;
      }
      return {
        type: "or",
        items: [input.head, ...input.tail.map((item) => item.item)],
      } as Ast;
    }
  )
);

const UnarySeqItem = $.seq(
  [
    ["prefix", $.opt($.or(["\\!"]))],
    ["body", NodeTypes.Paren],
    ["postfix", $.opt($.or(["\\+|\\*"]))],
  ],
  handleUnary
);

const SeqItem = $.or([UnarySeqItem, Token, Ident]);
const Sequence = $.def(
  NodeTypes.Sequence,
  $.seq(
    [
      ["head", SeqItem],
      ["tail", $.repeat($.seq([__, ["item", SeqItem]]))],
    ],
    (input: { head: Ast; tail: Array<{ item: Ast }> }) => {
      if (input.tail.length === 0) {
        return input.head;
      }
      return {
        type: "seq",
        items: [input.head, ...input.tail.map((item) => item.item)],
      } as Ast;
    }
  )
);

// Or > Sequence > Paren(Or) | Ident
const Paren = $.def(
  NodeTypes.Paren,
  $.seq(["\\(", ["item", NodeTypes.Or], "\\)"], (input: { item: Ast }) => {
    return input.item;
  })
);

const UnaryExpr = $.def(
  NodeTypes.UnaryExpression,
  $.seq(
    [
      ["prefix", $.opt($.or(["\\!"]))],
      ["body", $.or([Paren, Or])],
      ["postfix", $.opt($.or(["\\+|\\*"]))],
    ],
    handleUnary
  )
);

const Expr = $.def(NodeTypes.Expression, $.or([Paren, UnaryExpr]));

const DefineStmt = $.def(
  NodeTypes.Define,
  $.seq(
    [
      // a = b c
      ["name", Ident],
      _,
      "\\=",
      _,
      ["value", Or],
      _,
      ["code", $.opt($.pair({ open: "{", close: "}" }))],
      ";",
    ],
    (input) => {
      return {
        type: "def",
        name: input.name,
        value: input.value,
        code: input.code?.slice(1, -1),
      } as Ast;
    }
  )
);

const EmptyStatement = $.def(
  NodeTypes.Empty,
  $.seq(
    [_, $.or(["\\n", $.eof()])],
    (input: any): Ast => ({
      type: "empty",
    })
  )
);

const CommentStatement = $.def(
  NodeTypes.Comment,
  $.seq(
    ["//", ["comment", "[^\\n]*"], $.or(["\\n", $.eof()])],
    // ["//", ["comment", "[^\\n]*"], "\\n"],
    (input: any): Ast => ({
      type: "comment",
      comment: input.comment,
    })
  )
);

// const CommentStatement = $.def(
//   NodeTypes.Comment,
//   // $.seq(["//", ["comment", "[^\\n]*"], $.or(["\\n", $.eof()])], (input) => {
//   //   return {
//   //     type: "comment",
//   //     comment: input.comment,
//   //   } as Ast;
//   // }),
//   $.seq(
//     [
//       "\\/\\/[^\\n]*",
//       // $.or(["\\n", $.eof()])
//     ],
//     (input) => {
//       return {
//         type: "comment",
//         comment: input.slice(2),
//       } as Ast;
//     }
//   )
// );

export const Program = $.def(
  NodeTypes.Program,
  $.seq(
    [
      _,
      // statements
      [
        "statements",
        $.repeat(
          $.seq([
            _,
            ["stmt", $.or([CommentStatement, DefineStmt, EmptyStatement])],
            _,
            "(\\n)?",
          ]),
          undefined,
          (input) => input.stmt
        ),
      ],
      _,
      $.eof(),
    ],
    (input) => {
      return {
        type: "program",
        statements: input.statements,
      };
    }
  )
);

export function initGrammerParser(): RootParser {
  return compile(Program);
}

import { run, test, is } from "@mizchi/test";
import { RootParser } from "../types";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const opts = { pairs: ["{", "}"], contextRoot: Symbol() };
  test("Seq with or", () => {
    const parse = compile(Sequence);
    is(parse("a (b)"), {
      result: {
        type: "seq",
        items: [
          { type: "ident", name: "a" },
          { type: "ident", name: "b" },
        ],
      },
    });
  });
  test("Seq", () => {
    const parse = compile(Sequence);
    is(parse("a b c"), {
      result: {
        type: "seq",
        items: [
          { type: "ident", name: "a" },
          { type: "ident", name: "b" },
          { type: "ident", name: "c" },
        ],
      },
    });
    is(parse("a"), {
      result: { type: "ident", name: "a" },
    });
  });
  test("Or", () => {
    const parse = compile(Or);
    is(parse("a/b/c"), {
      result: {
        type: "or",
        items: [
          { type: "ident", name: "a" },
          { type: "ident", name: "b" },
          { type: "ident", name: "c" },
        ],
      },
    });
    is(parse("a"), {
      result: { type: "ident", name: "a" },
    });
  });

  test("Expr", () => {
    const parse = compile(Token);
    is(parse('"abc"'), {
      result: {
        type: "token",
        value: "abc",
      },
    });
    const parseExpr = compile(UnaryExpr);
    is(parseExpr("a"), {
      result: {
        type: "ident",
        name: "a",
      },
    });
    is(parseExpr("a+"), {
      result: {
        type: "repeat",
        min: 1,
        child: {
          type: "ident",
          name: "a",
        },
      },
    });
    is(parseExpr("a*"), {
      result: {
        type: "repeat",
        min: 0,
        child: {
          type: "ident",
          name: "a",
        },
      },
    });
    is(parseExpr("!a"), {
      result: {
        type: "not",
        child: {
          type: "ident",
          name: "a",
        },
      },
    });

    is(parseExpr("(a b)+"), {
      result: {
        type: "repeat",
        child: {
          type: "seq",
          items: [
            {
              type: "ident",
              name: "a",
            },
            {
              type: "ident",
              name: "b",
            },
          ],
        },
        min: 1,
      },
    });

    is(parseExpr("a (b)+"), {
      result: {
        type: "seq",
        items: [
          {
            type: "ident",
            name: "a",
          },
          {
            type: "repeat",
            min: 1,
            child: {
              type: "ident",
              name: "b",
            },
          },
        ],
      },
    });
  });

  test("def", () => {
    const parse = compile(DefineStmt);
    is(parse("a=b/c;"), {
      result: {
        type: "def",
        name: {
          type: "ident",
          name: "a",
        },
        value: {
          type: "or",
          items: [
            {
              type: "ident",
              name: "b",
            },
            {
              type: "ident",
              name: "c",
            },
          ],
        },
      },
    });
    is(parse(`a="hi";`), {
      result: {
        type: "def",
        name: {
          type: "ident",
          name: "a",
        },
        value: {
          type: "token",
          value: "hi",
        },
      },
    });
    is(parse(`a=b {(input) => return input.a};`), {
      result: {
        type: "def",
        name: {
          type: "ident",
          name: "a",
        },
        value: {
          type: "ident",
          name: "b",
        },
        code: "(input) => return input.a",
      },
    });
  });
  test("comment", () => {
    const parse = compile(CommentStatement);
    is(parse("//a"), {
      result: {
        type: "comment",
        comment: "a",
      },
    });
    is(parse("//"), {
      result: {
        type: "comment",
        comment: "",
      },
    });
    is(parse("//a\n"), {
      result: {
        type: "comment",
        comment: "a",
      },
    });
  });

  test("program", () => {
    const parse = compile(Program);
    const code = `a=a;a=x;`;
    is(parse("//xxx"), {
      result: {
        type: "program",
        statements: [
          {
            type: "comment",
            comment: "xxx",
          },
        ],
      },
    });
    is(parse("//xxx\n \n//yyy"), {
      result: {
        type: "program",
        statements: [
          {
            type: "comment",
            comment: "xxx",
          },
          {
            type: "comment",
            comment: "yyy",
          },
        ],
      },
    });
    is(parse(code), {
      result: {
        type: "program",
        statements: [
          {
            type: "def",
            name: {
              type: "ident",
              name: "a",
            },
            value: {
              type: "ident",
              name: "a",
            },
          },
          {
            type: "def",
            name: {
              type: "ident",
              name: "a",
            },
            value: {
              type: "ident",
              name: "x",
            },
          },
        ],
      },
    });

    test("program2", () => {
      const parse = compile(Program);
      const code = `
a=a;
      a=x/y;`;
      // console.log(parse(code));
      // throw new Error("");
      is(parse(code), {
        result: {
          type: "program",
          statements: [
            {
              type: "def",
              name: {
                type: "ident",
                name: "a",
              },
              value: {
                type: "seq",
                items: [
                  {
                    type: "ident",
                    name: "a",
                  },
                ],
              },
            },
            {
              type: "def",
              name: {
                type: "ident",
                name: "a",
              },
              value: {
                type: "seq",
                items: [
                  {
                    type: "ident",
                    name: "x",
                  },
                  {
                    type: "ident",
                    name: "y",
                  },
                ],
              },
            },
          ],
        },
      });
    });
  });
  // cancel();
  run({ stopOnFail: true, stub: true, isMain });
}
