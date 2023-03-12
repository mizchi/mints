import { encode as encodeToCbor } from "./cbor_subset";
import {
	E_cidsList,
	E_entryRefId,
	E_flagsList,
	E_keyList,
	E_popList,
	E_refs,
	E_reshapeEachs,
	E_reshapes,
	E_rules,
	// E_strings,
	E_values,
} from "../src/constants";
import { Snapshot } from "../src/types";

export function encodeSnapshotToBinary(snapshot: Snapshot): ArrayBuffer {
	const toArray = (xs: { [key: string]: number | number[] }) =>
		Object.entries(xs).map(([k, v]) => [parseInt(k), v]);
	const newSnapshot = [
		snapshot[E_entryRefId],
		snapshot[E_rules],
		snapshot[E_values],
		snapshot[E_refs],
		snapshot[E_cidsList],
		toArray(snapshot[E_reshapes]),
		toArray(snapshot[E_reshapeEachs]),
		toArray(snapshot[E_flagsList]),
		toArray(snapshot[E_keyList]),
		toArray(snapshot[E_popList]),
	];
	return encodeToCbor(newSnapshot);
}
