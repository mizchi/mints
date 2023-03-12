import type { Snapshot } from "../../pargen/src/types";
import { funcs } from "./runtime/funcs";
import { createParserWithSnapshot } from "../../pargen/src/index";
import { parseTokens } from "./runtime/tokenizer";
import { loadSnapshot } from "./runtime/load_snapshot";
import { detectInlineOptions } from "./runtime/options";
import { Opts, TransformResult } from "./types";

const snapshot = loadSnapshot();
const parse = createParserWithSnapshot(funcs, snapshot as Snapshot);

export function transformSync(input: string, opts?: Opts): TransformResult {
	const cache = opts?.cache;
	const sep = opts?.sep || "\n";
	if (!opts) {
		opts = detectInlineOptions(input);
		opts.jsx = opts.jsx ?? "React.createElement";
		opts.jsxFragment = opts.jsxFragment ?? "React.Fragment";
	}

	let tokens: string[] = [];
	let results: string[] = [];
	let used = new Set<number>();
	for (const t of parseTokens(input)) {
		if (t === "\n" && tokens.length > 0) {
			let transformed: string;
			const cacheKey = cache ? calcHash(tokens.join(" ")) : -1;
			if (cache?.has(cacheKey)) {
				transformed = cache.get(cacheKey)!;
			} else {
				const result = process(tokens.slice(), opts);
				if (result.error) return result;
				transformed = result.code;
			}
			results.push(transformed);
			if (cache) {
				cache.set(cacheKey, transformed);
				used.add(cacheKey);
			}
			tokens = [];
		} else {
			tokens.push(t);
		}
	}
	return {
		used,
		code: results.join(sep),
	};
}

function process(tokens: string[], opts: Opts): TransformResult {
	const parsed = parse(tokens.slice(), opts);
	if (parsed.error) return parsed;
	return {
		code: parsed.xs
			.map((r) => (typeof r === "number" ? tokens[r] : r))
			.join(""),
	};
}

// https://github.com/darkskyapp/string-hash/blob/master/index.js
function calcHash(str: string) {
	let hash = 5381;
	let i = str.length;
	while (i) {
		hash = (hash * 33) ^ str.charCodeAt(--i);
	}
	return hash >>> 0;
}
