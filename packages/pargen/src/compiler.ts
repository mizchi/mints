import {
  Compiler,
  defaultReshape,
  ErrorType,
  InternalParser,
  NodeKind,
  ParseError,
  ParseResult,
  ParseSuccess,
  Range,
  Ref,
  Repeat,
  Rule,
  Seq,
} from "./types";
import { createRegexMatcher, createStringMatcher } from "./utils";

export const createParseSuccess = (
  result: any,
  pos: number,
  len: number,
  ranges: Range[] = [[pos, pos + len]]
) => {
  let newRanges: Range[] = [];
  if (ranges.length > 0) {
    // let start = ranges[0][0];
    newRanges = ranges.reduce((acc, [nextStart, end], index) => {
      // omit [a,a]
      if (nextStart === end) return acc;
      // first item
      if (index === 0) return [...acc, [nextStart, end]];
      const [lastStart, lastEnd] = acc.slice(-1)[0];
      if (lastEnd === nextStart) {
        return [...acc.slice(0, -1), [lastStart, end]];
      }
      return [...acc, [nextStart, end]];
    }, [] as Range[]);
  }

  return {
    error: false,
    result,
    len,
    pos,
    ranges: newRanges,
  } as ParseSuccess;
};

export const createParseError = <ET extends ErrorType>(
  kind: NodeKind,
  errorType: ET,
  pos: number,
  rootId: number,
  rule: Rule,
  detail?: any
): ParseError => {
  return {
    error: true,
    kind,
    rootId,
    id: rule.id,
    errorType,
    pos,
    detail,
  };
};

export function compileFragment(
  rule: Rule,
  compiler: Compiler,
  rootId: number
): InternalParser {
  const internalParser = compileFragmentInternal(rule, compiler, rootId);
  // generic cache
  const parser: InternalParser = (ctx, pos) => {
    return ctx.cache.getOrCreate(rule.id, pos, () => {
      return internalParser(ctx, pos);
    });
  };
  return parser;
}

function compileFragmentInternal(
  rule: Rule,
  compiler: Compiler,
  rootId: number
): InternalParser {
  // if (rule.id === "seq:222") {
  //   throw rule;
  // }
  // TODO: why?
  // @ts-ignore
  if (rule === Object) {
    console.log("compiler", rootId);
    throw new Error("Object is not allowed in rule");
  }
  // console.log("rule.id", rule.id);
  const reshape = rule.reshape ?? defaultReshape;
  switch (rule.kind) {
    case NodeKind.NOT: {
      const childParser = compileFragment(rule.child, compiler, rootId);
      return (ctx, pos) => {
        const result = childParser(ctx, pos);
        if (result.error === true) {
          return createParseSuccess(result, pos, 0);
        }
        return createParseError(
          rule.kind,
          ErrorType.Not_IncorrectMatch,
          pos,
          rootId,
          rule,
          result.len
        );
      };
    }
    case NodeKind.REF: {
      return (ctx, pos) => {
        const resolved = compiler.defs[rule.ref];
        if (!resolved) {
          throw new Error(`symbol not found: ${(rule as Ref).ref}`);
        }
        return resolved!(ctx, pos);
      };
    }
    case NodeKind.ATOM: {
      return (ctx, pos) => {
        return rule.parse(ctx, pos);
      };
    }

    case NodeKind.EOF: {
      return (ctx, pos) => {
        const ended = ctx.chars.length === pos;
        if (ended) {
          return createParseSuccess("", pos, 0);
        }
        return createParseError(
          rule.kind,
          ErrorType.Eof_Unmatch,
          pos,
          rootId,
          rule,
          rule.id
        );
      };
    }

    case NodeKind.REGEX: {
      let expr = rule.expr;
      const matcher = createRegexMatcher(expr);
      return (ctx, pos) => {
        const matched: string | null = matcher(ctx.raw, pos);
        if (matched == null) {
          if (rule.optional) {
            return createParseSuccess(null, pos, 0);
          } else {
            return createParseError(
              rule.kind,
              ErrorType.Token_Unmatch,
              pos,
              rootId,
              rule,
              expr
            );
          }
        }
        return createParseSuccess(
          reshape(matched),
          pos,
          Array.from(matched).length
        );
      };
    }

    case NodeKind.TOKEN: {
      let expr = rule.expr;
      // const matcher = createMatcher(expr);
      const matcher = createStringMatcher(expr);
      return (ctx, pos) => {
        const matched: string | null = matcher(ctx.raw, pos);
        if (matched == null) {
          if (rule.optional) {
            return createParseSuccess(null, pos, 0);
          } else {
            return createParseError(
              rule.kind,
              ErrorType.Token_Unmatch,
              pos,
              rootId,
              rule,
              expr
            );
          }
        }
        return createParseSuccess(
          reshape(matched),
          pos,
          Array.from(matched).length
        );
      };
    }
    case NodeKind.OR: {
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
            if (rule.optional) {
              return createParseSuccess(null, pos, 0);
            }
            errors.push(parsed);
            continue;
          }
          return parsed as ParseResult;
        }
        return createParseError(
          rule.kind,
          ErrorType.Or_UnmatchAll,
          pos,
          rootId,
          rule,
          {
            children: errors,
          }
        );
      };
    }
    case NodeKind.REPEAT: {
      const parser = compileFragment(rule.pattern, compiler, rootId);
      return (ctx, pos) => {
        const repeat = rule as Repeat;
        const xs: string[] = [];
        let ranges: Range[] = [];
        let cursor = pos;
        while (cursor < ctx.chars.length) {
          const parseResult = parser(ctx, cursor);
          if (parseResult.error === true) break;
          // stop infinite loop
          if (parseResult.len === 0) {
            throw new Error(`Zero offset repeat item is not allowed`);
          }
          xs.push(parseResult.result);
          ranges.push(...parseResult.ranges);
          cursor += parseResult.len;
        }
        // size check
        // TODO: detect max at adding
        if (
          xs.length < repeat.min ||
          // @ts-ignore
          (repeat.max && xs.length > repeat.max)
        ) {
          return createParseError(
            rule.kind,
            ErrorType.Repeat_RangeError,
            pos,
            rootId,
            rule
          );
        }
        return createParseSuccess(
          xs.map(reshape as any),
          pos,
          cursor - pos,
          ranges
        );
      };
    }
    case NodeKind.SEQ: {
      let isObjectMode = false;
      const parsers = (rule as Seq).children.map((c) => {
        const parse = compileFragment(c, compiler, rootId);
        if (c.key) isObjectMode = true;
        return { parse, node: c };
      });
      return (ctx, pos) => {
        let cursor = pos;
        if (isObjectMode) {
          const result: any = {};
          for (const parser of parsers) {
            const parseResult = parser.parse(ctx, cursor);
            if (parseResult.error) {
              if (parser.node.optional) continue;
              return createParseError(
                rule.kind,
                ErrorType.Seq_Stop,
                pos,
                rootId,
                rule,
                {
                  child: parseResult,
                }
              );
            }
            if (parser.node.key && !parser.node.skip) {
              const reshaped = parseResult.result;
              result[parser.node.key] = reshaped;
            }
            // step cursor
            cursor += parseResult.len;
          }
          const reshaped = reshape(result);
          return createParseSuccess(reshaped, pos, cursor - pos);
        } else {
          // string mode
          let ranges: Range[] = [];
          for (const parser of parsers) {
            const parseResult = parser.parse(ctx, cursor);
            if (parseResult.error) {
              if (parser.node.optional) continue;
              return createParseError(
                rule.kind,
                ErrorType.Seq_Stop,
                pos,
                rootId,
                rule,
                {
                  child: parseResult,
                }
              );
            }
            if (!parser.node.skip) {
              // drop zero
              ranges.push(...parseResult.ranges);
            }
            cursor += parseResult.len;
          }
          const text = ranges
            .map(([start, end]) => ctx.raw.slice(start, end))
            .join("");
          return createParseSuccess(reshape(text), pos, cursor - pos, ranges);
        }
      };
    }
    default: {
      console.error(rule, rule === Object);
      throw new Error("[compile] Unknown Rule");
    }
  }
}
