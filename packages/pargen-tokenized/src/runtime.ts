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
  OPT_MASK,
  KEY_MASK,
  PUSH_MASK,
  POP_MASK,
  SKIP_MASK,
} from "./constants";
import {
  InternalParser,
  O_Rule,
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
export function compileFragment(rid: number): InternalParser {
  const parser: InternalParser = (ctx, pos) => {
    const cacheKey = pos + "@" + rid;
    let parsed = ctx.cache.get(cacheKey);
    if (!parsed) {
      parsed = _parse(ctx, pos, rid);
      if (!parsed.error) {
        const ruleIdx = rid;
        if (ruleIdx < 0) throw new Error("rule not found");
        const fnPtr = ctx.reshapes[ruleIdx];
        if (fnPtr != null) {
          const fn = ctx.funcs[fnPtr];
          const resolved = resolveTokens(ctx.tokens, parsed.results);
          const reshaped = fn(resolved, ctx);
          parsed.results = Array.isArray(reshaped) ? reshaped : [reshaped];
        }
      }
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

function _parse(ctx: ParseContext, pos: number, rid: number): ParseResult {
  const ruleType = ctx.rules[rid];
  const val = ctx.values[rid];

  switch (ruleType) {
    case RULE_ATOM: {
      const fn = ctx.funcs[val];
      return fn(ctx, pos);
    }
    case RULE_TOKEN: {
      const expect = ctx.strings[val];
      const token = ctx.tokens[pos];
      if (token === expect) {
        return success(pos, 1, [pos]);
      } else {
        return fail(pos, {
          code: CODE_TOKEN_UNMATCH,
          expect,
          got: token,
        });
      }
    }
    case RULE_REGEX: {
      const expect = ctx.strings[val];
      let re = new RegExp(expect, "u");
      const token = ctx.tokens[pos];
      const matched = re.test(token);
      if (matched) {
        return success(pos, 1, [pos]);
      } else {
        return fail(pos, {
          code: CODE_REGEX_UNMATCH,
          expect: re.toString(),
          got: token,
        });
      }
    }
    case RULE_EOF: {
      const ended = pos === ctx.tokens.length;
      if (ended) {
        return success(pos, 0, []);
      } else {
        return fail(pos, {
          code: CODE_EOF_UNMATCH,
        });
      }
    }
    case RULE_ANY: {
      return success(
        pos,
        val,
        [...Array(val).keys()].map((n) => n + pos)
      );
    }
    case RULE_NOT: {
      const childrenIds = ctx.cidsList[val];
      for (const ruleId of childrenIds) {
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
      return success(pos, 0, []);
    }
    case RULE_REF: {
      const rid = ctx.refs[val];
      const parse = ctx.parsers[rid];
      if (parse == null) {
        console.log("ctx", ctx);
      }
      return parse(ctx, pos);
    }
    case RULE_SEQ_OBJECT: {
      let cursor = pos;
      let result: any = {};
      const capturedStack: ParseSuccess[] = [];
      const flagsList = ctx.flagsList[rid];
      const childrenIds = ctx.cidsList[val];

      for (let i = 0; i < childrenIds.length; i++) {
        const parser = ctx.parsers[childrenIds[i]];
        const flags = flagsList[i] ?? 0;

        const parsed = parser(ctx, cursor);
        if (parsed.error) {
          if (OPT_MASK & flags) continue;
          return fail(cursor, {
            code: CODE_SEQ_STOP,
            childError: parsed,
            index: i,
          });
        }
        if (flags) {
          if (flags & KEY_MASK) {
            const key = ctx.strings[ctx.keyList[rid][i]];
            result[key] = resolveTokens(ctx.tokens, parsed.results);
          }
          if (flags & PUSH_MASK) capturedStack.push(parsed);
          if (flags & POP_MASK) {
            const popFn = ctx.funcs[ctx.popList[rid][i]];
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, {
                code: CODE_SEQ_NO_STACK_ON_POP,
                index: i,
              });
            }
            if (!popFn(top.results, parsed.results, ctx)) {
              return fail(cursor, {
                code: CODE_SEQ_UNMATCH_STACK,
                index: i,
              });
            }
          }
        }
        cursor += parsed.len;
      }
      return success(pos, cursor - pos, [result]);
    }

    case RULE_SEQ: {
      let cursor = pos;
      let results: any[] = [];
      let capturedStack: ParseSuccess[] = [];
      const flagsList = ctx.flagsList[rid];

      const childrenIds = ctx.cidsList[val];

      for (let i = 0; i < childrenIds.length; i++) {
        const parser = ctx.parsers[childrenIds[i]];
        const flags = flagsList[i] ?? 0;
        const parsed = parser(ctx, cursor);

        if (parsed.error) {
          if (flags & OPT_MASK) continue;
          return fail(cursor, {
            code: CODE_SEQ_STOP,
            childError: parsed,
            index: i,
          });
        }
        if (flags) {
          if (flags & PUSH_MASK) capturedStack.push(parsed);
          if (flags & POP_MASK) {
            const popFn = ctx.funcs[ctx.popList[rid][i]];
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, {
                code: CODE_SEQ_NO_STACK_ON_POP,
                index: i,
              });
            }
            if (!popFn(top.results, parsed.results, ctx)) {
              return fail(cursor, {
                code: CODE_SEQ_UNMATCH_STACK,
                index: i,
              });
            }
          }
        }
        if (flags & SKIP_MASK) {
          // console.log(
          //   "skip",
          //   { i, rid, flagsList, flags },
          //   // parsed.results,
          //   // flagsList,
          //   resolveTokens(ctx.tokens, parsed.results)
          // );
          // throw new Error("skip");
        } else {
          // console.log("add", i, parsed.results, flags);
          results.push(...parsed.results);
        }
        cursor += parsed.len;
      }
      // console.log("results", results);
      return success(pos, cursor - pos, results);
    }
    case RULE_OR: {
      const errors: ParseError[] = [];
      const childrenIds = ctx.cidsList[val];

      for (const idx of childrenIds) {
        const parse = ctx.parsers[idx];

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
    }

    case RULE_REPEAT: {
      const parser = ctx.parsers[val];
      let results: (string | number | any)[] = [];
      let cursor = pos;
      while (cursor < ctx.tokens.length) {
        const parsed = parser(ctx, cursor);
        if (parsed.error === true) break;
        if (parsed.len === 0) throw new Error(`ZeroRepeat`);

        const eachFn = ctx.reshapeEachs[rid];
        if (eachFn != null) {
          const tokens = resolveTokens(ctx.tokens, parsed.results);
          const fn = ctx.funcs[eachFn];
          results.push([fn(tokens, ctx)]);
        } else {
          results.push(...parsed.results);
        }
        cursor += parsed.len;
      }
      return success(pos, cursor - pos, results);
    }
  }
  // // @ts-ignore
  // throw new Error(`Unknown rule type ${rule}`);
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
