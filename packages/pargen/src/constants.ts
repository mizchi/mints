export const RULE_EOF = 1;
export const RULE_TOKEN = 2;
export const RULE_REGEX = 3;
export const RULE_REF = 4;
export const RULE_ANY = 5;
export const RULE_OR = 6;
export const RULE_NOT = 7;
export const RULE_ATOM = 8;
export const RULE_SEQ_OBJECT = 9;
export const RULE_SEQ = 10;
export const RULE_REPEAT = 11;

export const HEADER_ORDER = [
  RULE_EOF,
  RULE_TOKEN,
  RULE_REGEX,
  RULE_ATOM,
  RULE_REF,
  RULE_ANY,
  RULE_NOT,
  RULE_OR,
  RULE_SEQ,
  RULE_SEQ_OBJECT,
  RULE_REPEAT,
] as const;

export const CODE_NOT_INCORRECT_MATCH = 1;
export const CODE_EOF_UNMATCH = 2;
export const CODE_TOKEN_UNMATCH = 3;
export const CODE_REGEX_UNMATCH = 4;
export const CODE_SEQ_STOP = 5;
export const CODE_SEQ_UNMATCH_STACK = 6;
export const CODE_SEQ_NO_STACK_ON_POP = 7;
export const CODE_SEQ_STACK_LEFT = 8;
export const CODE_OR_UNMATCH_ALL = 9;
export const CODE_REPEAT_RANGE = 10;
export const CODE_ATOM_PARSE_ERROR = 11;

export const OPT_MASK = 0b00001;
export const SKIP_MASK = 0b00010;
export const KEY_MASK = 0b00100;
export const PUSH_MASK = 0b01000;
export const POP_MASK = 0b10000;

export const E_entryRefId = 0;
export const E_rules = 1;
export const E_values = 2;
export const E_refs = 3;
export const E_cidsList = 4;
export const E_reshapes = 5;
export const E_reshapeEachs = 6;
export const E_flagsList = 7;
export const E_keyList = 8;
export const E_popList = 9;
export const E_strings = 10;
