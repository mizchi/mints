import { builder as $ } from "./ctx";
import { NodeTypes, RESERVED_WORDS, _, __ } from "./constants";

const reserved = "(" + RESERVED_WORDS.join("|") + ")";
export const identifier = $.def(
  NodeTypes.Identifier,
  $.seq([$.not(reserved), "([a-zA-Z_\\$][a-zA-Z_\\$\\d]*)"])
);
