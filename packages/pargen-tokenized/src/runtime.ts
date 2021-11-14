import {
  ANY,
  ATOM,
  Compiler,
  EOF,
  ERROR_Eof_Unmatch,
  ERROR_Not_IncorrectMatch,
  ERROR_Or_UnmatchAll,
  ERROR_Regex_Unmatch,
  ERROR_Repeat_RangeError,
  ERROR_Seq_NoStackOnPop,
  ERROR_Seq_Stop,
  ERROR_Seq_UnmatchStack,
  ERROR_Token_Unmatch,
  InternalParser,
  NOT,
  OR,
  ParseError,
  ParseErrorData,
  ParseResult,
  ParseSuccess,
  REF,
  REGEX,
  REPEAT,
  Repeat,
  Rule,
  SEQ,
  SEQ_OBJECT,
  TOKEN,
} from "./types";

const resolveToken = (tokens: string[], result: any) => {
  if (typeof result === "number") {
    return tokens[result];
  }
  if (typeof result === "string") {
    return result;
  }
  return result;
};
const resolveTokens = (tokens: string[], results: any[]) =>
  results.map((r) => resolveToken(tokens, r));

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
  const parser: InternalParser = (ctx, pos) => {
    // use cached result
    const cacheKey = pos + "@" + rule.id;
    let parsed = ctx.cache.get(cacheKey);
    if (!parsed) {
      parsed = internalParser(ctx, pos);
      ctx.cache.set(cacheKey, parsed);
    }
    // update deepest error
    if (parsed.error) {
      if (!ctx.currentError) ctx.currentError = parsed;
      if (parsed.pos >= ctx.currentError.pos) ctx.currentError = parsed;
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
    // generic rule
    case ATOM: {
      return (ctx, pos) => rule.parse(ctx, pos);
    }
    case TOKEN: {
      let expr = rule.expr;
      return (ctx, pos) => {
        const token = ctx.tokens[pos];
        if (token === expr) {
          return success(pos, 1, [rule.reshape ? rule.reshape(token) : pos]);
        } else {
          return fail(pos, rootId, {
            errorType: ERROR_Token_Unmatch,
            expect: expr,
            got: token,
          });
        }
      };
    }
    case REGEX: {
      let re = rule.expr instanceof RegExp ? rule.expr : new RegExp(rule.expr);
      return (ctx, pos) => {
        const token = ctx.tokens[pos];
        const matched = re.test(token);
        if (matched) {
          return success(pos, 1, [rule.reshape ? rule.reshape(token) : pos]);
        } else {
          return fail(pos, rootId, {
            errorType: ERROR_Regex_Unmatch,
            expect: re.toString(),
            got: token,
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
    case ANY: {
      return (ctx, pos) => {
        return success(
          pos,
          rule.len,
          rule.reshape
            ? [rule.reshape(ctx.tokens.slice(pos, pos + rule.len))]
            : [...Array(rule.len).keys()].map((n) => n + pos)
        );
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
              matched: result,
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
    case SEQ_OBJECT: {
      const parsers = rule.children.map((c) => {
        const parse = compileFragment(c as Rule, compiler, rootId);
        return { parse, opt: c.opt, key: c.key, push: c.push, pop: c.pop };
      });
      return (ctx, pos) => {
        let cursor = pos;
        let result: any = {};
        const capturedStack: ParseSuccess[] = [];
        for (let i = 0; i < parsers.length; i++) {
          const parser = parsers[i];
          const parsed = parser.parse(ctx, cursor);
          // check stack pop
          if (parsed.error) {
            if (parser.opt) continue;
            return fail(cursor, rootId, {
              errorType: ERROR_Seq_Stop,
              childError: parsed,
              index: i,
            });
          }
          if (parser.push) {
            capturedStack.push(parsed);
          }
          if (parser.pop) {
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, rootId, {
                errorType: ERROR_Seq_NoStackOnPop,
                index: i,
              });
            }
            if (!parser.pop(top.results, parsed.results, ctx)) {
              return fail(cursor, rootId, {
                errorType: ERROR_Seq_UnmatchStack,
                index: parsers.indexOf(parser),
              });
            }
          }
          if (parser.key) {
            result[parser.key] = resolveTokens(ctx.tokens, parsed.results);
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
        return { parse, skip: c.skip, opt: c.opt, push: c.push, pop: c.pop };
      });
      return (ctx, pos) => {
        let cursor = pos;
        let results: any[] = [];
        let capturedStack: ParseSuccess[] = [];
        for (let i = 0; i < parsers.length; i++) {
          let parser = parsers[i];
          const parsed = parser.parse(ctx, cursor);
          if (parsed.error) {
            if (parser.opt) continue;
            return fail(cursor, rootId, {
              errorType: ERROR_Seq_Stop,
              childError: parsed,
              index: i,
            });
          }
          if (parser.push) capturedStack.push(parsed);
          if (parser.pop) {
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, rootId, {
                errorType: ERROR_Seq_NoStackOnPop,
                index: i,
              });
            }
            if (!parser.pop(top.results, parsed.results, ctx)) {
              return fail(cursor, rootId, {
                errorType: ERROR_Seq_UnmatchStack,
                index: i,
              });
            }
          }
          if (!parser.skip) {
            results.push(...parsed.results);
          }
          cursor += parsed.len;
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
        while (cursor < ctx.tokens.length) {
          const parseResult = parser(ctx, cursor);
          if (parseResult.error === true) break;
          if (parseResult.len === 0) throw new Error(`ZeroRepeat`);
          if (rule.reshapeEach) {
            const tokens = resolveTokens(ctx.tokens, parseResult.results);
            results.push([rule.reshapeEach(tokens, ctx)]);
          } else {
            results.push(...parseResult.results);
          }
          cursor += parseResult.len;
        }
        // size check
        if (
          results.length < repeat.min ||
          (repeat.max && results.length > repeat.max)
        ) {
          return fail(pos, rootId, {
            errorType: ERROR_Repeat_RangeError,
          });
        }
        if (rule.reshape) {
          return success(pos, cursor - pos, [
            rule.reshape(resolveTokens(ctx.tokens, results), ctx),
          ]);
        }
        return success(pos, cursor - pos, results);
      };
    }
    default: {
      throw new Error();
    }
  }
}
