import {
  E_entryRefId,
  E_flagsList,
  E_keyList,
  E_popList,
  E_reshapeEachs,
} from "../../../pargen-tokenized/src/constants";
import {
  E_cidsList,
  E_refs,
  E_reshapes,
  E_rules,
  E_values,
} from "../../../pargen-tokenized/src/constants";
import { Snapshot } from "../../../pargen-tokenized/src/types";
import { decodeBase64 } from "../decode/decodeBase64";
import { decode } from "../decode/decode_cbor_subset";
import { snapshot } from "./snapshot_b64";
import strings from "./strings.json";

const buf = decodeBase64(snapshot);

export function loadSnapshot() {
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
