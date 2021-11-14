import {
  RULE_ANY,
  RULE_ATOM,
  RULE_EOF,
  CODE_EOF_UNMATCH,
  CODE_NOT_INCORRECT_MATCH,
  CODE_OR_UNMATCH_ALL,
  CODE_REGEX_UNMATCH,
  CODE_SEQ_NO_STACK_ON_POP,
  CODE_SEQ_STOP,
  CODE_SEQ_UNMATCH_STACK,
  CODE_TOKEN_UNMATCH,
  RULE_NOT,
  RULE_OR,
  RULE_REF,
  RULE_REGEX,
  RULE_REPEAT,
  RULE_SEQ,
  RULE_SEQ_OBJECT,
  RULE_TOKEN,
} from "./constants";
import {
  Compiler,
  InternalParser,
  ParseError,
  ParseErrorData,
  ParseResult,
  ParseSuccess,
  Rule,
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
    case RULE_ATOM: {
      return (ctx, pos) => rule.parse(ctx, pos);
    }
    case RULE_TOKEN: {
      let expr = rule.expr;
      return (ctx, pos) => {
        const token = ctx.tokens[pos];
        if (token === expr) {
          return success(pos, 1, [rule.reshape ? rule.reshape(token) : pos]);
        } else {
          return fail(pos, rootId, {
            code: CODE_TOKEN_UNMATCH,
            expect: expr,
            got: token,
          });
        }
      };
    }
    case RULE_REGEX: {
      let re = rule.expr instanceof RegExp ? rule.expr : new RegExp(rule.expr);
      return (ctx, pos) => {
        const token = ctx.tokens[pos];
        const matched = re.test(token);
        if (matched) {
          return success(pos, 1, [rule.reshape ? rule.reshape(token) : pos]);
        } else {
          return fail(pos, rootId, {
            code: CODE_REGEX_UNMATCH,
            expect: re.toString(),
            got: token,
          });
        }
      };
    }
    case RULE_EOF: {
      return (ctx, pos) => {
        const ended = pos === ctx.tokens.length;
        if (ended) {
          return success(pos, 1, []);
        } else {
          return fail(pos, rootId, {
            code: CODE_EOF_UNMATCH,
          });
        }
      };
    }
    case RULE_ANY: {
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
    case RULE_NOT: {
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
              code: CODE_NOT_INCORRECT_MATCH,
              matched: result,
            });
          }
        }
        // all parser does not match. it's correct
        return success(pos, 0, []);
      };
    }
    case RULE_REF: {
      return (ctx, pos) => {
        const resolvedRule = compiler.parsers.get(rule.ref);
        return resolvedRule!(ctx, pos);
      };
    }
    case RULE_SEQ_OBJECT: {
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
              code: CODE_SEQ_STOP,
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
                code: CODE_SEQ_NO_STACK_ON_POP,
                index: i,
              });
            }
            if (!parser.pop(top.results, parsed.results, ctx)) {
              return fail(cursor, rootId, {
                code: CODE_SEQ_UNMATCH_STACK,
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

    case RULE_SEQ: {
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
              code: CODE_SEQ_STOP,
              childError: parsed,
              index: i,
            });
          }
          if (parser.push) capturedStack.push(parsed);
          if (parser.pop) {
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, rootId, {
                code: CODE_SEQ_NO_STACK_ON_POP,
                index: i,
              });
            }
            if (!parser.pop(top.results, parsed.results, ctx)) {
              return fail(cursor, rootId, {
                code: CODE_SEQ_UNMATCH_STACK,
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
    case RULE_OR: {
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
          code: CODE_OR_UNMATCH_ALL,
          errors,
        });
      };
    }

    case RULE_REPEAT: {
      const parser = compileFragment(rule.pattern, compiler, rootId);
      return (ctx, pos) => {
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
