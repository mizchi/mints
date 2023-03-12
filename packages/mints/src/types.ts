import type { ParseError } from "../../pargen/src/types";

export type Opts = {
	jsx?: string;
	jsxFragment?: string;
	cache?: Map<number, string>;
	sep?: string;
};

export type TransformResult = TransformSuccess | ParseError;

export type TransformSuccess = {
	error?: undefined;
	code: string;
	used?: Set<number>;
};
