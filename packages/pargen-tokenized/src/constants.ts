export const RULE_SEQ = 1;
export const RULE_SEQ_OBJECT = 2;
export const RULE_REPEAT = 3;
export const RULE_TOKEN = 4;
export const RULE_REGEX = 5;
export const RULE_OR = 6;
export const RULE_REF = 7;
export const RULE_EOF = 8;
export const RULE_NOT = 9;
export const RULE_ATOM = 10;
export const RULE_ANY = 11;

export const CODE_NOT_INCORRECT_MATCH = 16;
export const CODE_EOF_UNMATCH = 17;
export const CODE_TOKEN_UNMATCH = 18;
export const CODE_REGEX_UNMATCH = 19;

export const CODE_SEQ_STOP = 20;
export const CODE_SEQ_UNMATCH_STACK = 21;
export const CODE_SEQ_NO_STACK_ON_POP = 22;
export const CODE_SEQ_STACK_LEFT = 23;

export const CODE_OR_UNMATCH_ALL = 24;
export const CODE_REPEAT_RANGE = 25;
export const CODE_ATOM_PARSE_ERROR = 26;
