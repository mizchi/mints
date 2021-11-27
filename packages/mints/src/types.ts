import type { ParseError } from "../../pargen-tokenized/src/types";

export type Opts = {
  jsx?: string;
  jsxFragment?: string;
};

export type TransformResult = TransformSuccess | ParseError;

export type TransformSuccess = {
  error?: undefined;
  code: string;
};
