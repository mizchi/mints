import { createContext } from "../index";

enum T {
  Member,
  Ident,
  Unary,
  CallExpession,
  Primary,
}

const { compile, builder: $ } = createContext<T>({
  composeTokens: false,
  refs: T,
  pairs: ["{", "}"],
});
const Ident = $.tok("a");

// const Unary = $.def(T.Unary, $.seq(["\\(", T.Member, "\\)"]));

const Primary = $.def(T.Primary, $.or([Ident]));

const Member = $.or([
  Primary,
  $.seq([$.repeat_seq([".", Ident], [1]), Primary]),
]);

const CallExpression = $.def(T.CallExpession, $.seq([Member, "\\(", "\\)"]));

const parse = compile(CallExpression);

const ret = parse("a.a()");
console.log(ret);

// export { compile, builder };
