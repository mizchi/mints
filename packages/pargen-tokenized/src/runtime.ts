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
  InternalParser,
  ParseContext,
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
  errorData: ErrorData
): ParseError {
  return {
    error: true,
    pos,
    ...errorData,
  };
}

// parse with cache
export function compileFragment(rule: Rule): InternalParser {
  // console.log("compile", rule);
  const parser: InternalParser = (ctx, pos) => {
    // use cached result
    const cacheKey = pos + "@" + rule.u;
    let parsed = ctx.cache.get(cacheKey);
    if (!parsed) {
      parsed = _parse(rule, ctx, pos);
      ctx.cache.set(cacheKey, parsed);
    }
    if (parsed.error) {
      if (!ctx.currentError) ctx.currentError = parsed;
      if (parsed.pos >= ctx.currentError.pos) ctx.currentError = parsed;
    }
    return parsed;
  };
  return parser;
}

function _parse(rule: Rule, ctx: ParseContext, pos: number): ParseResult {
  switch (rule.t) {
    // generic rule
    case RULE_ATOM:
      return rule.c(ctx, pos);
    case RULE_TOKEN: {
      let expect = rule.c;
      // return (ctx, pos) => {
      const token = ctx.tokens[pos];
      if (token === expect) {
        return success(pos, 1, [rule.r ? rule.r(token) : pos]);
      } else {
        return fail(pos, {
          code: CODE_TOKEN_UNMATCH,
          expect,
          got: token,
        });
      }
      // };
    }
    case RULE_REGEX: {
      let re = rule.c instanceof RegExp ? rule.c : new RegExp(rule.c);
      const token = ctx.tokens[pos];
      const matched = re.test(token);
      if (matched) {
        return success(pos, 1, [rule.r ? rule.r(token) : pos]);
      } else {
        return fail(pos, {
          code: CODE_REGEX_UNMATCH,
          expect: re.toString(),
          got: token,
        });
      }
    }
    case RULE_EOF: {
      // return (ctx, pos) => {
      const ended = pos === ctx.tokens.length;
      if (ended) {
        return success(pos, 1, []);
      } else {
        return fail(pos, {
          code: CODE_EOF_UNMATCH,
        });
      }
      // };
    }
    case RULE_ANY: {
      // return (ctx, pos) => {
      return success(
        pos,
        rule.c,
        rule.r
          ? [rule.r(ctx.tokens.slice(pos, pos + rule.c))]
          : [...Array(rule.c).keys()].map((n) => n + pos)
      );
      // };
    }
    case RULE_NOT: {
      // return (ctx, pos) => {
      for (const ruleId of rule.c as number[]) {
        const parse = ctx.parsers[ruleId];
        const result = parse(ctx, pos);
        if (result.error) {
          continue;
        } else {
          return fail(pos, {
            code: CODE_NOT_INCORRECT_MATCH,
            matched: result,
          });
        }
      }
      // all parser does not match. it's correct
      return success(pos, 0, []);
      // };
    }
    case RULE_REF: {
      // return (ctx, pos) => {
      const parse = ctx.parsers[ctx.refs[rule.c]];
      return parse(ctx, pos);
      // };
    }
    case RULE_SEQ_OBJECT: {
      // return (ctx, pos) => {
      let cursor = pos;
      let result: any = {};
      const capturedStack: ParseSuccess[] = [];
      for (let i = 0; i < rule.c.length; i++) {
        const parser = ctx.parsers[rule.c[i] as number];

        const flags = rule.f[i];
        const parsed = parser(ctx, cursor);

        if (parsed.error) {
          if (flags?.opt) continue;
          return fail(cursor, {
            code: CODE_SEQ_STOP,
            childError: parsed,
            index: i,
          });
        }
        if (flags) {
          if (flags.key) {
            result[flags.key] = resolveTokens(ctx.tokens, parsed.results);
          }
          if (flags.push) {
            capturedStack.push(parsed);
          }
          if (flags.pop) {
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, {
                code: CODE_SEQ_NO_STACK_ON_POP,
                index: i,
              });
            }
            if (!flags.pop(top.results, parsed.results, ctx)) {
              return fail(cursor, {
                code: CODE_SEQ_UNMATCH_STACK,
                index: i,
              });
            }
          }
        }
        cursor += parsed.len;
      }
      if (rule.r) result = rule.r(result, ctx);
      return success(pos, cursor - pos, [result]);
      // };
    }

    case RULE_SEQ: {
      // return (ctx, pos) => {
      let cursor = pos;
      let results: any[] = [];
      let capturedStack: ParseSuccess[] = [];
      for (let i = 0; i < rule.c.length; i++) {
        const parser = ctx.parsers[rule.c[i] as number];
        const flags = rule.f[i];
        const parsed = parser(ctx, cursor);

        if (parsed.error) {
          if (flags && flags.opt) continue;
          return fail(cursor, {
            code: CODE_SEQ_STOP,
            childError: parsed,
            index: i,
          });
        }

        if (flags) {
          if (flags.push) capturedStack.push(parsed);
          if (flags.pop) {
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, {
                code: CODE_SEQ_NO_STACK_ON_POP,
                index: i,
              });
            }
            if (!flags.pop(top.results, parsed.results, ctx)) {
              return fail(cursor, {
                code: CODE_SEQ_UNMATCH_STACK,
                index: i,
              });
            }
          }
        }

        if (flags == null || !flags.skip) {
          results.push(...parsed.results);
        }
        cursor += parsed.len;
      }
      if (rule.r) {
        const resolvedTokens = resolveTokens(ctx.tokens, results);
        results = rule.r(resolvedTokens, ctx) as any;
      }
      return success(pos, cursor - pos, results);
      // };
    }
    case RULE_OR: {
      // return (ctx, pos) => {
      const errors: ParseError[] = [];
      for (const next of rule.c as number[]) {
        const parse = ctx.parsers[next];
        const parsed = parse(ctx, pos);
        if (parsed.error === true) {
          errors.push(parsed);
          continue;
        }
        return parsed as ParseResult;
      }
      return fail(pos, {
        code: CODE_OR_UNMATCH_ALL,
        errors,
      });
      // };
    }

    case RULE_REPEAT: {
      // return (ctx, pos) => {
      const parser = ctx.parsers[rule.c as number];
      let results: (string | number | any)[] = [];
      let cursor = pos;
      while (cursor < ctx.tokens.length) {
        const parseResult = parser(ctx, cursor);
        if (parseResult.error === true) break;
        if (parseResult.len === 0) throw new Error(`ZeroRepeat`);
        if (rule.e) {
          const tokens = resolveTokens(ctx.tokens, parseResult.results);
          results.push([rule.e(tokens, ctx)]);
        } else {
          results.push(...parseResult.results);
        }
        cursor += parseResult.len;
      }
      if (rule.r) {
        results = rule.r(resolveTokens(ctx.tokens, results), ctx);
      }
      return success(pos, cursor - pos, results);
      // };
    }
  }
}

// export function walkRule(rule: Rule, visitor: (node: Rule) => void) {
//   switch (rule.t) {
//     case RULE_REPEAT: {
//       walkRule(rule.c, visitor);
//       break;
//     }
//     case RULE_OR:
//     case RULE_SEQ:
//     case RULE_SEQ_OBJECT:
//     case RULE_NOT:
//       rule.c.map((c) => walkRule(c, visitor));
//   }
//   visitor(rule);
// }

// export function compileRules(defs: Rule[]): Rule[] {
//   const builtRules: Rule[] = [];

//   function _compile(rule: Rule): number {
//     switch (rule.t) {
//       case RULE_REPEAT: {
//         rule.c = _compile(rule.c as Rule);
//         break;
//       }
//       case RULE_OR:
//       case RULE_SEQ:
//       case RULE_SEQ_OBJECT:
//       case RULE_NOT: {
//         rule.c = (rule.c as Rule[]).map(_compile);
//       }
//     }
//     const id = builtRules.length;
//     builtRules.push(rule);
//     return id;
//   }

//   defs.forEach(_compile);

//   return builtRules;
// }
