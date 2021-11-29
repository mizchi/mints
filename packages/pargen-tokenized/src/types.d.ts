import type { RULE_ANY, RULE_ATOM, RULE_NOT, RULE_OR, RULE_REF, RULE_REGEX, RULE_REPEAT, RULE_SEQ, RULE_SEQ_OBJECT, RULE_TOKEN, RULE_EOF, CODE_EOF_UNMATCH, CODE_NOT_INCORRECT_MATCH, CODE_ATOM_PARSE_ERROR, CODE_OR_UNMATCH_ALL, CODE_REGEX_UNMATCH, CODE_REPEAT_RANGE, CODE_SEQ_NO_STACK_ON_POP, CODE_SEQ_STACK_LEFT, CODE_SEQ_STOP, CODE_SEQ_UNMATCH_STACK, CODE_TOKEN_UNMATCH } from "./constants";
export declare type Ptr<T> = number & {
    t: T;
};
export declare type ReshapePtr<In = any, Out = any> = Ptr<(input: In, ctx: ParseContext) => Out>;
export declare type Atom = {
    t: typeof RULE_ATOM;
    c: Ptr<(ctx: ParseContext, pos: number) => ParseResult>;
};
export declare type Any<T = any> = {
    t: typeof RULE_ANY;
    c: number;
    r: ReshapePtr;
};
export declare type Eof = {
    t: typeof RULE_EOF;
};
export declare type Not = {
    t: typeof RULE_NOT;
    c: Rule[];
};
export declare type Flags = {
    opt?: boolean;
    skip?: boolean;
    push?: boolean;
    key?: string;
    pop?: number;
};
export declare type Seq<T = string, U = string> = {
    t: typeof RULE_SEQ;
    c: Rule[] | number[];
    f: (Flags | null)[];
    r: ReshapePtr;
};
export declare type SeqObject<T = any, U = any> = {
    t: typeof RULE_SEQ_OBJECT;
    c: Rule[] | number[];
    f: (Flags | null)[];
    r: ReshapePtr;
};
export declare type Ref<T = any, U = any> = {
    t: typeof RULE_REF;
    c: number;
    r: ReshapePtr;
};
export declare type Repeat<T = string, U = T, R = U[]> = {
    t: typeof RULE_REPEAT;
    c: Rule | number;
    e: number;
    r: ReshapePtr;
};
export declare type Or = {
    t: typeof RULE_OR;
    c: Array<Seq | Token | Ref | Regex> | number[];
};
export declare type Token<T = string> = {
    t: typeof RULE_TOKEN;
    c: string;
    r: ReshapePtr;
};
export declare type Regex<T = string> = {
    t: typeof RULE_REGEX;
    c: string;
    r: ReshapePtr;
};
export declare type Rule = Seq | SeqObject | Token | Or | Repeat | Ref | Eof | Not | Atom | Regex | Any;
export declare type RootCompiler = (node: Rule | number) => RootParser;
export declare type RootParser = (tokens: string[], opts?: any, pos?: number, entryRef?: number) => ParseSuccess | (ParseError & {
    tokens: string[];
});
export declare type RuleExpr = Rule | string | number;
export declare type Snapshot = [
    entryRefId: number,
    rules: Array<Rule["t"]>,
    values: Array<number>,
    refs: number[],
    cidsList: Array<number[]>,
    reshapes: {
        [key: number]: number;
    },
    reshapeEachs: {
        [key: number]: number;
    },
    flagsList: {
        [key: number]: number[];
    },
    keyList: {
        [key: number]: number[];
    },
    popList: {
        [key: number]: number[];
    },
    strings: string[]
];
export declare type ParseContext = Snapshot & {
    t: string[];
    funcs: Function[];
    cache: Map<string, ParseResult>;
    currentError: ParseError | null;
    opts: any;
};
export declare type InternalParser = (ctx: ParseContext, pos: number) => ParseResult;
export declare type ParseResult = ParseSuccess | ParseError;
export declare type ParseSuccess = {
    error: false;
    pos: number;
    len: number;
    xs: Array<number | any>;
};
declare type RepeatRangeError = [code: typeof CODE_REPEAT_RANGE];
declare type NotIncorrectMatch = [
    code: typeof CODE_NOT_INCORRECT_MATCH,
    matched: ParseSuccess
];
declare type EofUnmatch = [code: typeof CODE_EOF_UNMATCH];
declare type TokenUnmatch = [
    code: typeof CODE_TOKEN_UNMATCH,
    expect: string,
    got: string
];
declare type RegexUnmatch = [
    code: typeof CODE_REGEX_UNMATCH,
    expect: string,
    got: string
];
declare type SeqStop = [
    code: typeof CODE_SEQ_STOP,
    index: number,
    childError: ParseError
];
declare type SeqNoStack = [code: typeof CODE_SEQ_NO_STACK_ON_POP, index: number];
declare type SeqStackLeft = [code: typeof CODE_SEQ_STACK_LEFT];
declare type SeqUnmatchStack = [code: typeof CODE_SEQ_UNMATCH_STACK, index: number];
declare type UnmatchAll = [code: typeof CODE_OR_UNMATCH_ALL, errors: Array<ParseError>];
declare type AtomError = [code: typeof CODE_ATOM_PARSE_ERROR, childError: ParseError];
export declare type ParseErrorData = RepeatRangeError | NotIncorrectMatch | EofUnmatch | TokenUnmatch | RegexUnmatch | SeqStop | SeqUnmatchStack | SeqNoStack | SeqStackLeft | AtomError | UnmatchAll;
export declare type ParseError = {
    error: true;
    pos: number;
    detail: ParseErrorData;
};
export {};
