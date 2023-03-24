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
  E_reshapes,
  E_rules,
  E_values,
  E_strings,
  E_cidsList,
  E_refs,
  E_flagsList,
  E_keyList,
  E_popList,
  E_reshapeEachs,
} from "./constants";
import {
  ParseContext,
  ParseError,
  ParseErrorData,
  ParseResult,
  ParseSuccess,
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
  results: (number | T)[],
) => {
  return {
    error: false,
    pos,
    len,
    xs: results,
  } as ParseSuccess;
};

export function fail<ErrorData extends ParseErrorData>(
  pos: number,
  errorData: ErrorData,
): ParseError {
  return {
    error: true,
    pos,
    detail: errorData,
  };
}

// parse with cache
export function parseWithCache(
  ctx: ParseContext,
  pos: number,
  rid: number,
): ParseResult {
  const cacheKey = pos + "@" + rid;
  let parsed = ctx.cache.get(cacheKey);
  if (!parsed) {
    parsed = _parse(ctx, pos, rid);
    if (!parsed.error) {
      const ruleIdx = rid;
      const fnPtr = ctx[E_reshapes][ruleIdx];
      if (fnPtr != null) {
        const fn = ctx.funcs[fnPtr];
        const resolved = resolveTokens(ctx.t, parsed.xs);
        const reshaped = fn(resolved, ctx);
        parsed.xs = Array.isArray(reshaped) ? reshaped : [reshaped];
      }
    }
    ctx.cache.set(cacheKey, parsed);
  }
  if (parsed.error) {
    if (!ctx.currentError) ctx.currentError = parsed;
    if (parsed.pos >= ctx.currentError.pos) ctx.currentError = parsed;
  }
  return parsed;
}

function _parse(ctx: ParseContext, pos: number, rid: number): ParseResult {
  const ruleType = ctx[E_rules][rid];
  const val = ctx[E_values][rid];

  switch (ruleType) {
    case RULE_ATOM: {
      const fn = ctx.funcs[val];
      return fn(ctx, pos);
    }
    case RULE_TOKEN: {
      const expect = ctx[E_strings][val];
      const token = ctx.t[pos];
      if (token === expect) {
        return success(pos, 1, [pos]);
      } else {
        return fail(pos, [CODE_TOKEN_UNMATCH, expect, token]);
      }
    }
    case RULE_REGEX: {
      const expect = ctx[E_strings][val];
      let re = new RegExp(expect, "u");
      const token = ctx.t[pos];
      const matched = re.test(token);
      if (matched) {
        return success(pos, 1, [pos]);
      } else {
        return fail(pos, [CODE_REGEX_UNMATCH, re.toString(), token]);
      }
    }
    case RULE_EOF: {
      const ended = pos === ctx.t.length;
      if (ended) {
        return success(pos, 0, []);
      } else {
        return fail(pos, [CODE_EOF_UNMATCH]);
      }
    }
    case RULE_ANY: {
      return success(
        pos,
        val,
        [...Array(val).keys()].map((n) => n + pos),
      );
    }
    case RULE_NOT: {
      const childrenIds = ctx[E_cidsList][val];
      for (const ruleId of childrenIds) {
        const result = parseWithCache(ctx, pos, ruleId);

        if (result.error) {
          continue;
        } else {
          return fail(pos, [CODE_NOT_INCORRECT_MATCH, result]);
        }
      }
      return success(pos, 0, []);
    }
    case RULE_REF: {
      const rid = ctx[E_refs][val];
      return parseWithCache(ctx, pos, rid);
    }
    case RULE_SEQ_OBJECT: {
      let cursor = pos;
      let result: any = {};
      const capturedStack: ParseSuccess[] = [];
      const flagsList = ctx[E_flagsList][rid];
      const childrenIds = ctx[E_cidsList][val];

      for (let i = 0; i < childrenIds.length; i++) {
        const crid = childrenIds[i];
        const flags = flagsList[i] ?? 0;

        const parsed = parseWithCache(ctx, cursor, crid);
        if (parsed.error) {
          if (OPT_MASK & flags) continue;
          return fail(cursor, [CODE_SEQ_STOP, i, parsed]);
        }
        if (flags) {
          if (flags & KEY_MASK) {
            const key = ctx[E_strings][ctx[E_keyList][rid][i]];
            result[key] = resolveTokens(ctx.t, parsed.xs);
          }
          if (flags & PUSH_MASK) capturedStack.push(parsed);
          if (flags & POP_MASK) {
            const popFn = ctx.funcs[ctx[E_popList][rid][i]];
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, [CODE_SEQ_NO_STACK_ON_POP, i]);
            }
            if (!popFn(top.xs, parsed.xs, ctx)) {
              return fail(cursor, [CODE_SEQ_UNMATCH_STACK, i]);
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
      const flagsList = ctx[E_flagsList][rid];

      const childrenIds = ctx[E_cidsList][val];

      for (let i = 0; i < childrenIds.length; i++) {
        const crid = childrenIds[i];
        const flags = flagsList?.[i] ?? 0;
        const parsed = parseWithCache(ctx, cursor, crid);

        if (parsed.error) {
          if (flags & OPT_MASK) continue;
          return fail(cursor, [CODE_SEQ_STOP, i, parsed]);
        }
        if (flags) {
          if (flags & PUSH_MASK) capturedStack.push(parsed);
          if (flags & POP_MASK) {
            const popFn = ctx.funcs[ctx[E_popList][rid][i]];
            const top = capturedStack.pop();
            if (top == null) {
              return fail(cursor, [CODE_SEQ_NO_STACK_ON_POP, i]);
            }
            if (!popFn(top.xs, parsed.xs, ctx)) {
              return fail(cursor, [CODE_SEQ_UNMATCH_STACK, i]);
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
          results.push(...parsed.xs);
        }
        cursor += parsed.len;
      }
      // console.log("results", results);
      return success(pos, cursor - pos, results);
    }
    case RULE_OR: {
      const errors: ParseError[] = [];
      const childrenIds = ctx[E_cidsList][val];

      for (const idx of childrenIds) {
        const parsed = parseWithCache(ctx, pos, idx);
        if (parsed.error === true) {
          errors.push(parsed);
          continue;
        }
        return parsed as ParseResult;
      }
      return fail(pos, [CODE_OR_UNMATCH_ALL, errors]);
    }

    case RULE_REPEAT: {
      let results: (string | number | any)[] = [];
      let cursor = pos;
      while (cursor < ctx.t.length) {
        const parsed = parseWithCache(ctx, cursor, val);
        if (parsed.error === true) break;
        if (parsed.len === 0) throw new Error(`ZeroRepeat`);

        const eachFn = ctx[E_reshapeEachs][rid];
        if (eachFn != null) {
          const tokens = resolveTokens(ctx.t, parsed.xs);
          const fn = ctx.funcs[eachFn];
          results.push([fn(tokens, ctx)]);
        } else {
          results.push(...parsed.xs);
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
