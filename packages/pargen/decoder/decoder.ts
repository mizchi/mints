import type { Snapshot } from "../src/types";
import {
	E_entryRefId,
	E_flagsList,
	E_keyList,
	E_popList,
	E_reshapeEachs,
	E_cidsList,
	E_refs,
	E_reshapes,
	E_rules,
	E_values,
} from "../src/constants";
import { decodeBase64 } from "./decode_b64";
import { decode } from "./decode_cbor_subset";

export function decodeBinary(b64: string, strings: string[]) {
	const buf = decodeBase64(b64);
	const decoded = decode(buf);
	const d = Object.fromEntries;
	return [
		decoded[E_entryRefId],
		decoded[E_rules],
		decoded[E_values],
		decoded[E_refs],
		decoded[E_cidsList],
		d(decoded[E_reshapes]),
		d(decoded[E_reshapeEachs]),
		d(decoded[E_flagsList]),
		d(decoded[E_keyList]),
		d(decoded[E_popList]),
		strings,
	] as Snapshot;
}
