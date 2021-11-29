import { snapshot } from "./snapshot_b64";
import strings from "./__strings.json";
import { decodeBinary } from "../../../pargen-tokenized/decoder/decoder";
export function loadSnapshot() {
  return decodeBinary(snapshot, strings);
}
