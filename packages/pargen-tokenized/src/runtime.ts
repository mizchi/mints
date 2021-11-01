// import { Regex } from "./../../pargen/src/types";
import {
  ATOM,
  Compiler,
  EOF,
  ERROR_Eof_Unmatch,
  ERROR_Not_IncorrectMatch,
  ERROR_Or_UnmatchAll,
  ERROR_Pair_Unmatch,
  ERROR_Regex_Unmatch,
  ERROR_Repeat_RangeError,
  ERROR_Seq_Stop,
  ERROR_Token_Unmatch,
  InternalParser,
  NOT,
  OR,
  PAIR_CLOSE,
  PAIR_OPEN,
  ParseContext,
  ParseError,
  ParseErrorData,
  ParseResult,
  ParseSuccess,
  REF,
  REGEX,
  REPEAT,
  Repeat,
  Reshape,
  Rule,
  SEQ,
  SEQ_OBJECT,
  TOKEN,
} from "./types";
// import {
//   // buildRangesToString,
//   createRegexMatcher,
//   createStringMatcher,
// } from "./utils";

// const USE_RANGE = Symbol();

const resolveTokens = (tokens: string[], results: any[]) =>
  results.map((r) => (typeof r === "number" ? tokens[r] : r));

export const success = <T = any>(
  pos: number,
  len: number,
  results: (number | T)[]
) => {
  return {
    error: false,
    pos,
    len,
    results,
  } as ParseSuccess;
};

export function fail<ErrorData extends ParseErrorData>(
  pos: number,
  rootId: number,
  errorData: ErrorData
): ParseError {
  return {
    error: true,
    rootId,
    // rule,
    pos,
    ...errorData,
  };
}

// parse with cache
export function compileFragment(
  rule: Rule,
  compiler: Compiler,
  rootId: number
): InternalParser {
  const internalParser = compileFragmentInternal(rule, compiler, rootId);
  // generic cache
  const parser: InternalParser = (ctx, pos) => {
    const beforeStack = ctx.openStack.slice();
    const parsed = ctx.cache.getOrCreate(rule.id, pos, () =>
      internalParser(ctx, pos)
    );
    // restore stack on parse error
    if (parsed.error) {
      ctx.openStack = beforeStack;
      // TODO: Refactor to Format error
      if (
        parsed.error &&
        [
          ERROR_Token_Unmatch,
          ERROR_Regex_Unmatch,
          ERROR_Eof_Unmatch,
          ERROR_Not_IncorrectMatch,
        ].includes(parsed.errorType)
      ) {
        ctx.currentError ??= parsed;
        if (ctx.currentError.pos < parsed.pos) {
          ctx.currentError = parsed;
        }
      }
    }
    return parsed;
  };
  return parser;
}

function compileFragmentInternal(
  rule: Rule,
  compiler: Compiler,
  rootId: number
): InternalParser {
  switch (rule.kind) {
    case TOKEN: {
      let expr = rule.expr;
      return (ctx, pos) => {
        const token = ctx.tokens[pos];
        if (token === expr) {
          return success(pos, 1, [rule.reshape ? rule.reshape(token) : pos]);
        } else {
          return fail(pos, rootId, {
            errorType: ERROR_Token_Unmatch,
          });
        }
      };
    }
    case REGEX: {
      let expr = rule.expr;
      const re = new RegExp(`^${expr}$`, "u");
      return (ctx, pos) => {
        const token = ctx.tokens[pos];
        const matched = re.test(token);
        if (matched) {
          return success(pos, 1, [rule.reshape ? rule.reshape(token) : pos]);
        } else {
          return fail(pos, rootId, {
            errorType: ERROR_Regex_Unmatch,
            expr: expr,
          });
        }
      };
    }
    case EOF: {
      return (ctx, pos) => {
        const ended = pos === ctx.tokens.length;
        if (ended) {
          return success(pos, 1, []);
        } else {
          return fail(pos, rootId, {
            errorType: ERROR_Eof_Unmatch,
          });
        }
      };
    }
    case NOT: {
      const parsers = rule.patterns.map((pat) =>
        compileFragment(pat, compiler, rootId)
      );
      return (ctx, pos) => {
        for (const parseChild of parsers) {
          const result = parseChild(ctx, pos);
          if (result.error) {
            continue;
          } else {
            return fail(pos, rootId, {
              errorType: ERROR_Not_IncorrectMatch,
            });
          }
        }
        // all parser does not match. it's correct
        return success(pos, 0, []);
      };
    }
    case REF: {
      return (ctx, pos) => {
        const resolvedRule = compiler.parsers.get(rule.ref);
        return resolvedRule!(ctx, pos);
      };
    }
    // generic rule
    case ATOM: {
      return (ctx, pos) => {
        return rule.parse(ctx, pos);
      };
    }
    case SEQ_OBJECT: {
      const parsers = rule.children.map((c) => {
        const parse = compileFragment(c as Rule, compiler, rootId);
        return { parse, opt: c.opt, key: c.key };
      });
      return (ctx, pos) => {
        let cursor = pos;
        let result: any = {};
        for (let i = 0; i < parsers.length; i++) {
          const parser = parsers[i];
          const parsed = parser.parse(ctx, cursor);
          if (parsed.error) {
            if (parser.opt) continue;
            return fail(cursor, rootId, {
              errorType: ERROR_Seq_Stop,
              childError: parsed,
              index: i,
            });
          } else {
            if (parser.key) {
              result[parser.key] = parsed.results;
            }
          }
          cursor += parsed.len;
        }
        if (rule.reshape) result = rule.reshape(result, ctx);

        return success(pos, cursor - pos, [result]);
      };
    }

    case SEQ: {
      const parsers = rule.children.map((c) => {
        const parse = compileFragment(c as Rule, compiler, rootId);
        return { parse, skip: c.skip, opt: c.opt };
      });
      return (ctx, pos) => {
        let cursor = pos;
        let results: any[] = [];
        for (const parser of parsers) {
          const parseResult = parser.parse(ctx, cursor);
          if (parseResult.error) {
            if (parser.opt) continue;
            return fail(cursor, rootId, {
              errorType: ERROR_Seq_Stop,
              childError: parseResult,
              index: parsers.indexOf(parser),
            });
          }
          if (!parser.skip) {
            results.push(...parseResult.results);
          }
          cursor += parseResult.len;
        }
        if (rule.reshape) {
          const resolvedTokens = resolveTokens(ctx.tokens, results);
          results = rule.reshape(resolvedTokens, ctx) as any;
        }
        return success(pos, cursor - pos, results);
      };
    }
    case OR: {
      const compiledPatterns = rule.patterns.map((p) => {
        return {
          parse: compileFragment(p, compiler, rootId),
          node: p,
        };
      });
      return (ctx, pos) => {
        const errors: ParseError[] = [];
        for (const next of compiledPatterns) {
          const parsed = next.parse(ctx, pos);
          if (parsed.error === true) {
            errors.push(parsed);
            continue;
          }
          return parsed as ParseResult;
        }
        return fail(pos, rootId, {
          errorType: ERROR_Or_UnmatchAll,
          errors,
        });
      };
    }

    case REPEAT: {
      const parser = compileFragment(rule.pattern, compiler, rootId);
      return (ctx, pos) => {
        const repeat = rule as Repeat;
        const results: (string | number | any)[] = [];
        let cursor = pos;
        while (true) {
          const parseResult = parser(ctx, cursor);
          if (parseResult.error === true) break;
          if (parseResult.len === 0) throw new Error(`ZeroRepeat`);
          results.push(...parseResult.results);
          cursor += parseResult.len;
        }
        // size check
        if (
          results.length < repeat.min ||
          // @ts-ignore
          (repeat.max && results.length > repeat.max)
        ) {
          return fail(pos, rootId, {
            errorType: ERROR_Repeat_RangeError,
          });
        }
        return success(pos, cursor - pos, results);
      };
    }
    // WIP
    // case PAIR_OPEN: {
    //   const parser = compileFragment(rule.pattern, compiler, rootId);
    //   return (ctx, pos) => {
    //     const parsed = parser(ctx, pos);
    //     // push stack
    //     if (!parsed.error) {
    //       ctx.openStack.push(parsed.results);
    //     }
    //     return parsed;
    //   };
    // }
    // case PAIR_CLOSE: {
    //   const parser = compileFragment(rule.pattern, compiler, rootId);
    //   return (ctx, pos) => {
    //     const parsed = parser(ctx, pos);
    //     // push stack
    //     if (!parsed.error) {
    //       const lastItem = ctx.openStack.slice(-1)[0];
    //       if (lastItem === parsed.result) {
    //         ctx.openStack.pop();
    //         return parsed;
    //       } else {
    //         return fail(rule, pos, rootId, {
    //           errorType: ERROR_Pair_Unmatch,
    //         });
    //       }
    //     }
    //     return parsed;
    //   };
    // }
    default: {
      throw new Error();
    }
  }
}
