import { ParseContext, ParseError, ParseErrorData, ParseResult, ParseSuccess } from "./types";
export declare const success: <T = any>(pos: number, len: number, results: (number | T)[]) => ParseSuccess;
export declare function fail<ErrorData extends ParseErrorData>(pos: number, errorData: ErrorData): ParseError;
export declare function parseWithCache(ctx: ParseContext, pos: number, rid: number): ParseResult;
